// Deterministic happy path: walks every state-changing entry point with valid
// inputs from realistic callers. After each write, reads on-chain state and
// asserts that fields/counters match.
import {
  addressOf, writeAndVerify, readView, readJson,
  assert, assertEq, uid, log,
} from "./lib.mjs";

export default async function detHappy() {
  const t0 = Date.now();
  log.suite("Det Happy — full lifecycle");

  const landlord = addressOf("LANDLORD_1");
  const tenant = addressOf("TENANT_1");

  // Realistic fresh tenancy
  const leaseId = uid("lease");
  const lease = {
    id: leaseId,
    propertyType: "1-bedroom apartment",
    propertyLabel: "Unit 4B, Riverside Court (redacted)",
    tenantWallet: tenant,
    landlordWallet: landlord,
    startDate: "2024-06-01",
    endDate: "2025-05-31",
    depositAmount: 2700,
    currency: "USD",
    termsSummary:
      "12-month AST, monthly rent $1,800, deposit $2,700. Tenant responsible for utilities. Property let furnished per attached inventory.",
    clauses: {
      depositReturn:
        "Deposit returned in full within 14 days, less reasonable evidenced deductions. Itemised receipts required.",
      damageResponsibility:
        "Tenant responsible for negligence damage. Not responsible for pre-existing damage in inventory or ordinary wear and tear.",
      cleaning:
        "Property returned in same standard of cleanliness as documented at move-in. Reasonable cleaning costs deductible only with photo evidence and third-party invoice.",
      inventory:
        "Signed inventory at move-in forms part of agreement. Items not listed cannot later be claimed.",
      wearAndTear:
        "Minor scuffs, light carpet wear, fading and small marks consistent with reasonable use are not chargeable.",
    },
    createdAt: Date.now(),
  };
  await writeAndVerify("LANDLORD_1", "create_lease", [leaseId, JSON.stringify(lease)]);

  // Read back and assert
  const storedLeaseRaw = await readView("get_lease", [leaseId]);
  assert(!!storedLeaseRaw, "lease was not stored");
  const storedLease = JSON.parse(storedLeaseRaw);
  assertEq(storedLease.depositAmount, 2700, "deposit amount round-trip");
  assertEq(storedLease.tenantWallet, tenant, "tenant wallet stored");
  log.info(`lease stored: ${leaseId}`);

  // Tenant files the dispute
  const disputeId = uid("dispute");
  const dispute = {
    tenantWallet: tenant,
    landlordWallet: landlord,
    depositAmount: 2700,
    amountWithheld: 2700,
    amountDisputed: 1800,
    currency: "USD",
    disputeType: "DAMAGE_DEDUCTION",
    filedBy: "TENANT",
    summary:
      "Landlord withheld the entire $2,700 deposit. Two deductions are disputed: a $225 wall repaint for a scuff that was logged on the signed move-in inventory, and a $150 cleaning fee that exceeds what reasonable evidence supports.",
    desiredOutcome:
      "Refund of the disputed $1,800. Tenant accepts that a portion of cleaning may be reasonable.",
    propertyType: "1-bedroom apartment",
  };
  await writeAndVerify("TENANT_1", "open_dispute", [disputeId, leaseId, JSON.stringify(dispute)]);

  const disp = await readJson("get_dispute", [disputeId]);
  assert(disp, "dispute was not stored");
  assertEq(disp.status, "FILED", "initial dispute status");
  assertEq(disp.leaseId, leaseId, "lease id linked");
  assertEq(disp.depositAmount, 2700, "deposit amount on dispute");
  log.info(`dispute filed: ${disputeId}`);

  // Evidence from both sides
  const evidenceFixtures = [
    {
      label: "TENANT_1",
      data: {
        side: "TENANT", phase: "MOVE_IN", type: "PHOTO", privacy: "REDACTED",
        title: "Living-room wall — existing scuff at skirting",
        description:
          "Wide-angle photo taken at move-in showing the dark scuff near the skirting board that the landlord later claimed as new damage.",
        uri: "ipfs://QmRiversideCt4B_movein_LR_wall",
        hash: "0xa7c1movein",
        source: "Tenant phone — original EXIF intact",
        issuedAt: "2024-06-01",
      },
    },
    {
      label: "TENANT_1",
      data: {
        side: "NEUTRAL", phase: "MOVE_IN", type: "CHECK_IN_REPORT", privacy: "REDACTED",
        title: "Signed move-in inventory and condition report",
        description:
          "Two-page condition report completed at handover; page 2 lists 'scuff to LR wall, near skirting' under pre-existing. Signed by tenant and landlord.",
        uri: "ipfs://QmRiversideCt4B_checkin_report",
        hash: "0xb12checkin",
        source: "Letting agent",
        issuedAt: "2024-06-01",
      },
    },
    {
      label: "LANDLORD_1",
      data: {
        side: "LANDLORD", phase: "AFTER_MOVE_OUT", type: "REPAIR_INVOICE", privacy: "PUBLIC",
        title: "Repaint invoice — $225",
        description:
          "Invoice from 'Quick Paint Co' dated three weeks after move-out for $225 to repaint the living room wall. Invoice does not identify which wall or describe the damage.",
        uri: "ipfs://QmRiversideCt4B_repaint_invoice",
        hash: "0xc99repaint",
        source: "Landlord",
        issuedAt: "2025-05-21",
      },
    },
    {
      label: "LANDLORD_1",
      data: {
        side: "LANDLORD", phase: "AFTER_MOVE_OUT", type: "CLEANING_INVOICE", privacy: "PUBLIC",
        title: "Cleaning invoice — $150",
        description:
          "Cleaning invoice for $150 covering kitchen and bathroom deep clean post-tenancy. Photos attached show grease on extractor and limescale on shower screen.",
        uri: "ipfs://QmRiversideCt4B_cleaning_invoice",
        hash: "0xd33clean",
        source: "Landlord",
        issuedAt: "2025-06-05",
      },
    },
  ];
  const evidenceIds = [];
  for (const e of evidenceFixtures) {
    const eid = uid("ev");
    evidenceIds.push(eid);
    await writeAndVerify(e.label, "add_evidence", [eid, disputeId, JSON.stringify({ ...e.data, id: eid })]);
  }
  const evList = await readJson("get_dispute_evidence", [disputeId], []);
  assertEq(evList.length, evidenceFixtures.length, "evidence count after writes");
  log.info(`evidence pinned: ${evList.length}`);

  // Deduction ledger — tenant lists what's being disputed
  const ledger = [
    {
      id: "ded_wall_repaint",
      disputeId,
      category: "WALL_DAMAGE",
      claimedAmount: 225,
      currency: "USD",
      description:
        "Landlord claims tenant caused scuff on living-room wall and charges $225 to repaint the full wall. Tenant disputes — mark was logged in signed move-in inventory.",
      leaseClause: "Damage responsibility clause",
      evidenceIds: [evidenceIds[0], evidenceIds[1], evidenceIds[2]],
    },
    {
      id: "ded_cleaning",
      disputeId,
      category: "CLEANING",
      claimedAmount: 150,
      currency: "USD",
      description:
        "Landlord deducted $150 for end-of-tenancy cleaning. Tenant cleaned before leaving; accepts some additional cleaning may have been needed but disputes the full amount as excessive.",
      leaseClause: "Cleaning clause",
      evidenceIds: [evidenceIds[3]],
    },
  ];
  await writeAndVerify("TENANT_1", "set_deduction_ledger", [disputeId, JSON.stringify(ledger)]);
  const storedLedger = await readJson("get_deduction_ledger", [disputeId], []);
  assertEq(storedLedger.length, 2, "ledger row count");
  assertEq(storedLedger[0].category, "WALL_DAMAGE", "first ledger category");
  log.info(`ledger stored with ${storedLedger.length} rows`);

  // Condition timeline
  const timeline = [
    { id: uid("tle"), type: "LEASE_SIGNED", at: "2024-05-25", party: "Tenant + Landlord",
      description: "Lease executed by both parties one week before move-in." },
    { id: uid("tle"), type: "MOVE_IN_INSPECTION", at: "2024-06-01", party: "Tenant + Landlord",
      description: "Joint walkthrough. Signed condition report noting existing wall scuff." },
    { id: uid("tle"), type: "MOVE_OUT_INSPECTION", at: "2025-05-31", party: "Landlord",
      description: "Landlord inspected unaccompanied; tenant not invited." },
    { id: uid("tle"), type: "DEDUCTION_NOTICE_SENT", at: "2025-06-10", party: "Landlord",
      description: "Landlord emailed itemised deductions totalling $375 against the $2,700 deposit." },
  ];
  await writeAndVerify("TENANT_1", "set_condition_timeline", [disputeId, JSON.stringify(timeline)]);
  const storedTl = await readJson("get_condition_timeline", [disputeId], []);
  assertEq(storedTl.length, 4, "timeline count");
  log.info(`timeline stored with ${storedTl.length} events`);

  // Confirm user index updated
  const tenantDisputes = await readJson("get_user_disputes", [tenant], []);
  assert(Array.isArray(tenantDisputes), "tenant disputes is array");
  assert(tenantDisputes.includes(disputeId), "dispute id indexed under tenant wallet");

  log.summary("Det Happy", true, Date.now() - t0);
  return { leaseId, disputeId };
}

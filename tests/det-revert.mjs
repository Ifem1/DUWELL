// Deterministic revert paths — one scenario per _user_err / required-field check.
// Each must revert on-chain. Asserts state unchanged after the failed call.
import {
  addressOf, writeAndVerify, readView, readJson,
  assert, uid, log,
} from "./lib.mjs";

export default async function detRevert() {
  const t0 = Date.now();
  log.suite("Det Revert — error paths");
  const landlord = addressOf("LANDLORD_2");
  const tenant = addressOf("TENANT_2");

  // 1) empty lease id → "Lease id is required."
  await writeAndVerify("LANDLORD_2", "create_lease", ["", "{}"], { expectRevert: true });

  // 2) duplicate lease id
  const dupLeaseId = uid("lease_dup");
  const goodLease = {
    tenantWallet: tenant, landlordWallet: landlord, depositAmount: 1500, currency: "USD",
    propertyType: "studio", propertyLabel: "Test studio (redacted)", startDate: "2024-01-01",
    endDate: "2025-01-01", termsSummary: "Short test", clauses: {},
  };
  await writeAndVerify("LANDLORD_2", "create_lease", [dupLeaseId, JSON.stringify(goodLease)]);
  await writeAndVerify(
    "LANDLORD_2", "create_lease",
    [dupLeaseId, JSON.stringify(goodLease)],
    { expectRevert: true },
  );
  // state unchanged: one record, same payload
  const dupRead = await readJson("get_lease", [dupLeaseId]);
  assert(dupRead, "first lease still present after duplicate-id revert");

  // 3) malformed lease JSON
  await writeAndVerify(
    "LANDLORD_2", "create_lease",
    [uid("lease_bad"), "{not json"],
    { expectRevert: true },
  );

  // 4) lease missing required field (no depositAmount)
  const noDeposit = { tenantWallet: tenant, landlordWallet: landlord };
  await writeAndVerify(
    "LANDLORD_2", "create_lease",
    [uid("lease_nodep"), JSON.stringify(noDeposit)],
    { expectRevert: true },
  );

  // 5) open_dispute referencing nonexistent lease
  const baseDispute = {
    tenantWallet: tenant, landlordWallet: landlord, depositAmount: 1500,
    amountWithheld: 1500, amountDisputed: 800, currency: "USD",
    disputeType: "CLEANING_FEE", filedBy: "TENANT",
    summary: "test dispute summary that is suitably long for review",
    desiredOutcome: "Partial refund", propertyType: "studio",
  };
  await writeAndVerify(
    "TENANT_2", "open_dispute",
    [uid("dispute_x"), uid("lease_does_not_exist"), JSON.stringify(baseDispute)],
    { expectRevert: true },
  );

  // 6) open_dispute missing required field (no disputeType)
  const dNoType = { ...baseDispute };
  delete dNoType.disputeType;
  await writeAndVerify(
    "TENANT_2", "open_dispute",
    [uid("dispute_x2"), dupLeaseId, JSON.stringify(dNoType)],
    { expectRevert: true },
  );

  // 7) duplicate dispute id
  const dupDisputeId = uid("dispute_dup");
  await writeAndVerify("TENANT_2", "open_dispute", [dupDisputeId, dupLeaseId, JSON.stringify(baseDispute)]);
  await writeAndVerify(
    "TENANT_2", "open_dispute",
    [dupDisputeId, dupLeaseId, JSON.stringify(baseDispute)],
    { expectRevert: true },
  );

  // 8) add_evidence to nonexistent dispute
  const evGood = {
    side: "TENANT", phase: "MOVE_IN", type: "PHOTO", privacy: "REDACTED",
    title: "Sample title", description: "Sample description",
  };
  await writeAndVerify(
    "TENANT_2", "add_evidence",
    [uid("ev"), uid("dispute_ghost"), JSON.stringify(evGood)],
    { expectRevert: true },
  );

  // 9) add_evidence missing required field (no 'side')
  const evNoSide = { ...evGood };
  delete evNoSide.side;
  await writeAndVerify(
    "TENANT_2", "add_evidence",
    [uid("ev"), dupDisputeId, JSON.stringify(evNoSide)],
    { expectRevert: true },
  );

  // 10) set_deduction_ledger with malformed JSON
  await writeAndVerify(
    "TENANT_2", "set_deduction_ledger",
    [dupDisputeId, "{still not json"],
    { expectRevert: true },
  );

  // 11) set_condition_timeline against missing dispute
  await writeAndVerify(
    "TENANT_2", "set_condition_timeline",
    [uid("dispute_ghost"), JSON.stringify([])],
    { expectRevert: true },
  );

  // 12) open_appeal against missing dispute
  await writeAndVerify(
    "TENANT_2", "open_appeal",
    [uid("appeal_x"), uid("dispute_ghost"), JSON.stringify({ reason: "X" })],
    { expectRevert: true },
  );

  // 13) finalize_dispute on nonexistent dispute
  await writeAndVerify(
    "TENANT_2", "finalize_dispute",
    [uid("dispute_ghost")],
    { expectRevert: true },
  );

  // Final state-unchanged check
  const dupDisp = await readJson("get_dispute", [dupDisputeId]);
  assert(dupDisp, "duplicate-source dispute still present");
  assert(dupDisp.status === "FILED", "status not mutated by failed writes");

  log.summary("Det Revert", true, Date.now() - t0);
}

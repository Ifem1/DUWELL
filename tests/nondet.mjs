// Non-deterministic suite — exercises every gl.eq_principle / gl.nondet path.
// Builds a fresh, fully-evidenced dispute, then runs the GenLayer judge,
// validates the on-chain JSON output, opens an appeal, runs the appeal review,
// then exercises the remaining nondet helpers.
import {
  addressOf, writeAndVerify, readView, readJson,
  assert, assertIn, uid, log,
} from "./lib.mjs";

const ALLOWED_DECISIONS = [
  "FULL_TENANT_REFUND", "PARTIAL_TENANT_REFUND", "LANDLORD_RETAINS_FULL_DEPOSIT",
  "PARTIALLY_RESOLVED", "NEEDS_MORE_EVIDENCE", "ESCALATE",
];
const ALLOWED_RESP = ["TENANT", "LANDLORD", "SHARED", "UNCLEAR"];
const ALLOWED_DED_RESULT = ["SUPPORTED", "PARTIALLY_SUPPORTED", "NOT_SUPPORTED", "UNCLEAR", "NOT_APPLICABLE"];
const ALLOWED_RISK = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ALLOWED_APPEAL = [
  "ORIGINAL_DECISION_UPHELD", "ORIGINAL_DECISION_ADJUSTED",
  "MORE_EVIDENCE_REQUIRED", "ESCALATE_TO_HUMAN_ARBITRATION", "APPEAL_REJECTED",
];

function inRange(n, lo, hi) {
  return typeof n === "number" && n >= lo && n <= hi;
}

async function seedDispute() {
  const landlord = addressOf("LANDLORD_1");
  const tenant = addressOf("TENANT_1");
  const leaseId = uid("lease_nd");
  const disputeId = uid("dispute_nd");

  await writeAndVerify("LANDLORD_1", "create_lease", [leaseId, JSON.stringify({
    tenantWallet: tenant, landlordWallet: landlord, depositAmount: 2700, currency: "USD",
    propertyType: "1-bedroom apartment", propertyLabel: "Unit 4B, Riverside Court (redacted)",
    startDate: "2024-06-01", endDate: "2025-05-31",
    termsSummary: "12-month AST, deposit $2,700, itemised receipts required.",
    clauses: {
      damageResponsibility: "Tenant not liable for pre-existing damage logged at move-in or ordinary wear and tear.",
      cleaning: "Reasonable cleaning deductible only with photo evidence and invoice.",
    },
  })]);

  await writeAndVerify("TENANT_1", "open_dispute", [disputeId, leaseId, JSON.stringify({
    tenantWallet: tenant, landlordWallet: landlord, depositAmount: 2700,
    amountWithheld: 2700, amountDisputed: 1800, currency: "USD",
    disputeType: "DAMAGE_DEDUCTION", filedBy: "TENANT",
    summary:
      "Landlord withheld $2,700. Disputing $225 wall repaint (mark logged on signed move-in inventory) and $150 cleaning (excessive).",
    desiredOutcome: "Refund $1,800. Accept a fraction of cleaning if reasonable.",
    propertyType: "1-bedroom apartment",
  })]);

  // Tenant evidence: move-in photo + signed inventory
  await writeAndVerify("TENANT_1", "add_evidence", [uid("ev"), disputeId, JSON.stringify({
    side: "TENANT", phase: "MOVE_IN", type: "PHOTO", privacy: "REDACTED",
    title: "Living-room wall existing scuff",
    description: "Move-in day photo clearly shows the dark scuff that the landlord later claimed as new damage.",
    uri: "ipfs://nd_movein_wall", source: "Tenant phone", issuedAt: "2024-06-01",
  })]);
  await writeAndVerify("TENANT_1", "add_evidence", [uid("ev"), disputeId, JSON.stringify({
    side: "NEUTRAL", phase: "MOVE_IN", type: "CHECK_IN_REPORT", privacy: "REDACTED",
    title: "Signed move-in inventory",
    description: "Page 2 lists 'scuff to LR wall, near skirting' under pre-existing items. Signed by both parties.",
    uri: "ipfs://nd_checkin", source: "Letting agent", issuedAt: "2024-06-01",
  })]);
  // Landlord evidence: vague repaint invoice + reasonable cleaning invoice
  await writeAndVerify("LANDLORD_1", "add_evidence", [uid("ev"), disputeId, JSON.stringify({
    side: "LANDLORD", phase: "AFTER_MOVE_OUT", type: "REPAIR_INVOICE", privacy: "PUBLIC",
    title: "Repaint invoice $225",
    description: "Three weeks post move-out. Does not identify which wall or describe damage.",
    uri: "ipfs://nd_repaint", source: "Landlord", issuedAt: "2025-05-21",
  })]);
  await writeAndVerify("LANDLORD_1", "add_evidence", [uid("ev"), disputeId, JSON.stringify({
    side: "LANDLORD", phase: "AFTER_MOVE_OUT", type: "CLEANING_INVOICE", privacy: "PUBLIC",
    title: "Cleaning invoice $150",
    description: "Kitchen and bathroom deep clean. Photos attached show grease on extractor.",
    uri: "ipfs://nd_cleaning", source: "Landlord", issuedAt: "2025-06-05",
  })]);

  // Deduction ledger
  await writeAndVerify("TENANT_1", "set_deduction_ledger", [disputeId, JSON.stringify([
    { id: "ded_wall_repaint", disputeId, category: "WALL_DAMAGE", claimedAmount: 225, currency: "USD",
      description: "Wall repaint claim contradicted by signed move-in inventory.",
      leaseClause: "Damage responsibility clause", evidenceIds: [] },
    { id: "ded_cleaning", disputeId, category: "CLEANING", claimedAmount: 150, currency: "USD",
      description: "Cleaning fee disputed as excessive; tenant accepts partial.",
      leaseClause: "Cleaning clause", evidenceIds: [] },
  ])]);

  // Timeline
  await writeAndVerify("TENANT_1", "set_condition_timeline", [disputeId, JSON.stringify([
    { id: uid("tle"), type: "LEASE_SIGNED", at: "2024-05-25", party: "Both", description: "Lease executed." },
    { id: uid("tle"), type: "MOVE_IN_INSPECTION", at: "2024-06-01", party: "Both", description: "Joint walkthrough; signed report." },
    { id: uid("tle"), type: "MOVE_OUT_INSPECTION", at: "2025-05-31", party: "Landlord", description: "Inspected unaccompanied." },
    { id: uid("tle"), type: "DEDUCTION_NOTICE_SENT", at: "2025-06-10", party: "Landlord", description: "Itemised deductions emailed." },
  ])]);

  return { leaseId, disputeId };
}

function validateReview(v) {
  assertIn(v.decision, ALLOWED_DECISIONS, "decision enum");
  assertIn(v.overall_responsibility, ALLOWED_RESP, "overall_responsibility enum");
  assertIn(v.risk_level, ALLOWED_RISK, "risk_level enum");
  assert(inRange(v.confidence, 0, 100), `confidence in [0,100], got ${v.confidence}`);
  assert(inRange(v.tenant_refund_percent, 0, 100), "tenant refund percent");
  assert(inRange(v.landlord_retained_percent, 0, 100), "landlord retained percent");
  assert(v.tenant_refund_amount >= 0, "refund amount non-negative");
  assert(v.landlord_retained_amount >= 0, "retained amount non-negative");
  assert(v.tenant_refund_amount + v.landlord_retained_amount <= (v.deposit_amount + 0.01), "split within deposit");
  assert(typeof v.reasoning_summary === "string" && v.reasoning_summary.trim().length > 0, "reasoning_summary non-empty");
  for (const k of ["lease_findings", "evidence_findings", "red_flags", "missing_information", "deduction_results"]) {
    assert(Array.isArray(v[k]), `${k} is array`);
  }
  for (const d of v.deduction_results) {
    assertIn(d.responsibility, ALLOWED_RESP, `deduction[${d.deduction_id}].responsibility`);
    assertIn(d.result, ALLOWED_DED_RESULT, `deduction[${d.deduction_id}].result`);
    assert(d.approved_amount >= 0, "approved amount non-negative");
  }
}

function validateAppeal(v) {
  assertIn(v.appeal_decision, ALLOWED_APPEAL, "appeal_decision enum");
  assertIn(v.new_decision, ALLOWED_DECISIONS, "new_decision enum");
  assert(inRange(v.confidence, 0, 100), "appeal confidence");
  assert(Array.isArray(v.accepted_arguments), "accepted_arguments is array");
  assert(Array.isArray(v.rejected_arguments), "rejected_arguments is array");
  assert(typeof v.reasoning_summary === "string" && v.reasoning_summary.trim().length > 0, "appeal reasoning non-empty");
}

export default async function nondet() {
  const t0 = Date.now();
  log.suite("Nondet — GenLayer consensus paths");

  const { disputeId } = await seedDispute();

  // judge_responsibility — main nondet
  await writeAndVerify("TENANT_1", "judge_responsibility", [disputeId]);
  const review = await readJson("get_responsibility_review", [disputeId]);
  assert(review, "responsibility review not stored");
  validateReview(review);
  log.info(`judge_responsibility verdict: ${review.decision} · refund=${review.tenant_refund_amount} · confidence=${review.confidence}`);

  // dispute status should have changed
  const dispAfter = await readJson("get_dispute", [disputeId]);
  assert(dispAfter.status !== "FILED", `dispute status should change after review; got ${dispAfter.status}`);
  log.info(`dispute status after review: ${dispAfter.status}`);

  // detect_evidence_conflicts — nondet helper (stores into dispute side-channel)
  await writeAndVerify("TENANT_1", "detect_evidence_conflicts", [disputeId]);
  const dispWithConflicts = await readJson("get_dispute", [disputeId]);
  assert(dispWithConflicts.evidenceConflicts, "evidenceConflicts not attached");
  assert(Array.isArray(dispWithConflicts.evidenceConflicts.conflicts), "conflicts array");
  log.info(`detected conflicts: ${dispWithConflicts.evidenceConflicts.conflicts.length}`);

  // interpret_lease_clause — nondet helper
  await writeAndVerify("TENANT_1", "interpret_lease_clause", [disputeId, "damageResponsibility"]);
  const dispWithClause = await readJson("get_dispute", [disputeId]);
  assert(dispWithClause.clauseInterpretations?.damageResponsibility, "clause interpretation not stored");
  log.info(`clause interpretation stored for damageResponsibility`);

  // assess_deduction_item — nondet helper (no on-chain storage assertion; just on-chain success)
  await writeAndVerify("TENANT_1", "assess_deduction_item", [disputeId, "ded_wall_repaint"]);

  // open_appeal then review_appeal
  const appealId = uid("appeal");
  await writeAndVerify("LANDLORD_1", "open_appeal", [appealId, disputeId, JSON.stringify({
    filedBy: "LANDLORD",
    reason: "WEAR_AND_TEAR_MISJUDGED",
    explanation:
      "Repaint cost is standard for a full-wall repaint; tenant's move-in scuff did not exempt them from later damage which extended beyond it.",
    newEvidenceUri: "ipfs://nd_landlord_new_photo",
  })]);
  const dispAppealed = await readJson("get_dispute", [disputeId]);
  assert(dispAppealed.status === "APPEALED", `dispute status APPEALED after open_appeal; got ${dispAppealed.status}`);

  await writeAndVerify("LANDLORD_1", "review_appeal", [appealId]);
  const ar = await readJson("get_appeal_review", [appealId]);
  assert(ar, "appeal review not stored");
  validateAppeal(ar);
  log.info(`review_appeal: ${ar.appeal_decision} → new_decision=${ar.new_decision}`);

  const dispFinal = await readJson("get_dispute", [disputeId]);
  assert(dispFinal.status === "FINALIZED", `dispute should be FINALIZED after appeal review; got ${dispFinal.status}`);

  log.summary("Nondet", true, Date.now() - t0);
  return { disputeId, decision: review.decision, appealDecision: ar.appeal_decision };
}

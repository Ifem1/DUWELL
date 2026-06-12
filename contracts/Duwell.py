# Duwell — GenLayer Rental Deposit Dispute Resolver
# Intelligent contract: GenLayer validators interpret lease terms, move-in / move-out
# evidence, deduction claims, photos, messages and invoices to reach a structured
# consensus verdict on rental deposit responsibility.

import json
from genlayer import *


ALLOWED_DECISIONS = {
    "FULL_TENANT_REFUND",
    "PARTIAL_TENANT_REFUND",
    "LANDLORD_RETAINS_FULL_DEPOSIT",
    "PARTIALLY_RESOLVED",
    "NEEDS_MORE_EVIDENCE",
    "ESCALATE",
}
ALLOWED_RESPONSIBILITY = {"TENANT", "LANDLORD", "SHARED", "UNCLEAR"}
ALLOWED_DEDUCTION_RESULT = {
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "NOT_SUPPORTED",
    "UNCLEAR",
    "NOT_APPLICABLE",
}
ALLOWED_RISK = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_APPEAL_DECISIONS = {
    "ORIGINAL_DECISION_UPHELD",
    "ORIGINAL_DECISION_ADJUSTED",
    "MORE_EVIDENCE_REQUIRED",
    "ESCALATE_TO_HUMAN_ARBITRATION",
    "APPEAL_REJECTED",
}

DECISION_TO_STATUS = {
    "FULL_TENANT_REFUND": "FULL_TENANT_REFUND",
    "PARTIAL_TENANT_REFUND": "PARTIAL_TENANT_REFUND",
    "PARTIALLY_RESOLVED": "PARTIAL_TENANT_REFUND",
    "LANDLORD_RETAINS_FULL_DEPOSIT": "LANDLORD_RETAINS_FULL_DEPOSIT",
    "NEEDS_MORE_EVIDENCE": "NEEDS_MORE_EVIDENCE",
    "ESCALATE": "ESCALATED",
}


def _user_err(msg: str):
    raise Exception(msg)


def _strip_wrappers(s: str) -> str:
    """Strip code-fence wrappers / leading 'json' labels that validators
    sometimes include despite being asked for strict JSON."""
    if not isinstance(s, str):
        return s
    t = s.strip().lstrip("﻿").strip()
    # ```json ... ```  or  ``` ... ```
    if t.startswith("```"):
        t = t[3:]
        if t.lower().startswith("json"):
            t = t[4:]
        t = t.strip()
        if t.endswith("```"):
            t = t[:-3].strip()
    # leading bare "json\n{...}" or 'json {...}'
    if t.lower().startswith("json"):
        rest = t[4:].lstrip()
        if rest.startswith("{") or rest.startswith("["):
            t = rest
    # if the whole thing is itself a JSON-encoded string, unwrap once
    if (t.startswith('"') and t.endswith('"')) or (t.startswith("'") and t.endswith("'")):
        try:
            inner = json.loads(t)
            if isinstance(inner, str):
                t = _strip_wrappers(inner)
        except Exception:
            pass
    return t.strip()


def _clamp(n, lo, hi):
    try:
        n = float(n)
    except Exception:
        return lo
    if n < lo:
        return lo
    if n > hi:
        return hi
    return n


# ---------------------------------------------------------------------------
class Duwell(gl.Contract):
    owner: Address
    lease_count: u256
    dispute_count: u256
    evidence_count: u256
    review_count: u256
    appeal_count: u256

    leases: TreeMap[str, str]
    disputes: TreeMap[str, str]
    dispute_evidence: TreeMap[str, str]          # dispute_id -> json list of evidence
    deduction_ledgers: TreeMap[str, str]
    condition_timelines: TreeMap[str, str]
    responsibility_reviews: TreeMap[str, str]    # dispute_id -> review json
    appeals: TreeMap[str, str]
    appeal_reviews: TreeMap[str, str]
    user_disputes: TreeMap[str, str]             # user wallet -> json list of dispute ids
    protocol_stats: TreeMap[str, str]

    # ----- init -----------------------------------------------------------
    def __init__(self):
        self.owner = gl.message.sender_address
        self.lease_count = 0
        self.dispute_count = 0
        self.evidence_count = 0
        self.review_count = 0
        self.appeal_count = 0

    # ===== deterministic writes ==========================================
    @gl.public.write
    def create_lease(self, lease_id: str, lease_json: str) -> None:
        if not lease_id:
            _user_err("Lease id is required.")
        if lease_id in self.leases:
            _user_err("Lease id already exists.")
        try:
            data = json.loads(lease_json)
        except Exception:
            _user_err("Lease payload must be valid JSON.")
        required = ["tenantWallet", "landlordWallet", "depositAmount"]
        for k in required:
            if k not in data:
                _user_err(f"Lease missing required field: {k}")
        self.leases[lease_id] = lease_json
        self.lease_count = self.lease_count + 1

    @gl.public.write
    def open_dispute(self, dispute_id: str, lease_id: str, dispute_json: str) -> None:
        if not dispute_id:
            _user_err("Dispute id is required.")
        if dispute_id in self.disputes:
            _user_err("Dispute id already exists.")
        if lease_id and lease_id not in self.leases:
            _user_err("Referenced lease does not exist.")
        try:
            data = json.loads(dispute_json)
        except Exception:
            _user_err("Dispute payload must be valid JSON.")
        for k in ["tenantWallet", "landlordWallet", "depositAmount", "disputeType", "summary"]:
            if k not in data:
                _user_err(f"Dispute missing required field: {k}")
        data["status"] = "FILED"
        data["leaseId"] = lease_id
        data["id"] = dispute_id
        self.disputes[dispute_id] = json.dumps(data)
        self.dispute_count = self.dispute_count + 1

        # index by users
        for wallet_key in ("tenantWallet", "landlordWallet"):
            w = data.get(wallet_key, "")
            if not w:
                continue
            existing = self.user_disputes[w] if w in self.user_disputes else "[]"
            try:
                arr = json.loads(existing)
            except Exception:
                arr = []
            if dispute_id not in arr:
                arr.append(dispute_id)
            self.user_disputes[w] = json.dumps(arr)

    @gl.public.write
    def add_evidence(self, evidence_id: str, dispute_id: str, evidence_json: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        try:
            ev = json.loads(evidence_json)
        except Exception:
            _user_err("Evidence payload must be valid JSON.")
        for k in ["side", "phase", "type", "title"]:
            if k not in ev:
                _user_err(f"Evidence missing required field: {k}")
        ev["id"] = evidence_id
        ev["disputeId"] = dispute_id

        existing = self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"
        try:
            arr = json.loads(existing)
        except Exception:
            arr = []
        arr.append(ev)
        self.dispute_evidence[dispute_id] = json.dumps(arr)
        self.evidence_count = self.evidence_count + 1

    @gl.public.write
    def set_deduction_ledger(self, dispute_id: str, ledger_json: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        try:
            json.loads(ledger_json)
        except Exception:
            _user_err("Ledger payload must be valid JSON.")
        self.deduction_ledgers[dispute_id] = ledger_json

    @gl.public.write
    def set_condition_timeline(self, dispute_id: str, timeline_json: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        try:
            json.loads(timeline_json)
        except Exception:
            _user_err("Timeline payload must be valid JSON.")
        self.condition_timelines[dispute_id] = timeline_json

    @gl.public.write
    def open_appeal(self, appeal_id: str, dispute_id: str, appeal_json: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        if appeal_id in self.appeals:
            _user_err("Appeal id already exists.")
        try:
            data = json.loads(appeal_json)
        except Exception:
            _user_err("Appeal payload must be valid JSON.")
        data["id"] = appeal_id
        data["disputeId"] = dispute_id
        self.appeals[appeal_id] = json.dumps(data)
        self.appeal_count = self.appeal_count + 1

        d = json.loads(self.disputes[dispute_id])
        d["status"] = "APPEALED"
        self.disputes[dispute_id] = json.dumps(d)

    @gl.public.write
    def finalize_dispute(self, dispute_id: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        d = json.loads(self.disputes[dispute_id])
        d["status"] = "FINALIZED"
        self.disputes[dispute_id] = json.dumps(d)

    # ===== non-deterministic GenLayer judgement ==========================
    @gl.public.write
    def judge_responsibility(self, dispute_id: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")

        dispute = self.disputes[dispute_id]
        lease_id = json.loads(dispute).get("leaseId", "")
        lease = self.leases[lease_id] if lease_id in self.leases else "{}"
        evidence = self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"
        ledger = self.deduction_ledgers[dispute_id] if dispute_id in self.deduction_ledgers else "[]"
        timeline = self.condition_timelines[dispute_id] if dispute_id in self.condition_timelines else "[]"

        prompt = f"""You are a panel of impartial rental-deposit dispute reviewers.
Interpret the lease, move-in / move-out evidence, deduction ledger and condition
timeline below. Decide responsibility for each disputed deduction, then produce a
fair deposit split.

LEASE JSON:
{lease}

DISPUTE JSON:
{dispute}

EVIDENCE JSON (array):
{evidence}

DEDUCTION LEDGER JSON (array):
{ledger}

CONDITION TIMELINE JSON (array):
{timeline}

Rules:
- Wear-and-tear is NOT a tenant-chargeable damage.
- A deduction is unsupported if move-in evidence already shows the condition.
- Cleaning fees are only partially supported if cost exceeds reasonable evidence.
- Be cautious; prefer NEEDS_MORE_EVIDENCE if evidence is too thin to decide.
- Refund + retained must not exceed deposit amount.

Return STRICT JSON matching exactly this schema (no prose, no markdown):
{{
  "decision": "FULL_TENANT_REFUND|PARTIAL_TENANT_REFUND|LANDLORD_RETAINS_FULL_DEPOSIT|PARTIALLY_RESOLVED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "tenant_refund_amount": number,
  "landlord_retained_amount": number,
  "deposit_amount": number,
  "currency": "USD",
  "tenant_refund_percent": number,
  "landlord_retained_percent": number,
  "confidence": number,
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "overall_responsibility": "TENANT|LANDLORD|SHARED|UNCLEAR",
  "deduction_results": [
    {{
      "deduction_id": "string",
      "category": "string",
      "claimed_amount": number,
      "approved_amount": number,
      "responsibility": "TENANT|LANDLORD|SHARED|UNCLEAR",
      "result": "SUPPORTED|PARTIALLY_SUPPORTED|NOT_SUPPORTED|UNCLEAR|NOT_APPLICABLE",
      "reason": "string"
    }}
  ],
  "lease_findings": ["string"],
  "evidence_findings": ["string"],
  "red_flags": ["string"],
  "missing_information": ["string"],
  "reasoning_summary": "string",
  "recommended_action": "string"
}}"""

        raw = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task=(
                "Produce a single rental-deposit dispute verdict as STRICT JSON "
                "(no prose, no markdown fences) matching the schema in the prompt."
            ),
            criteria=(
                "Output MUST be valid JSON parseable by json.loads. "
                "decision is one of FULL_TENANT_REFUND | PARTIAL_TENANT_REFUND | "
                "LANDLORD_RETAINS_FULL_DEPOSIT | PARTIALLY_RESOLVED | "
                "NEEDS_MORE_EVIDENCE | ESCALATE. "
                "overall_responsibility is one of TENANT | LANDLORD | SHARED | UNCLEAR. "
                "risk_level is one of LOW | MEDIUM | HIGH | CRITICAL. "
                "confidence, tenant_refund_percent and landlord_retained_percent are "
                "numbers between 0 and 100. "
                "tenant_refund_amount and landlord_retained_amount are non-negative "
                "numbers whose sum does not exceed deposit_amount. "
                "deduction_results is an array; each item has deduction_id, category, "
                "claimed_amount, approved_amount (>=0), responsibility in "
                "{TENANT,LANDLORD,SHARED,UNCLEAR}, result in "
                "{SUPPORTED,PARTIALLY_SUPPORTED,NOT_SUPPORTED,UNCLEAR,NOT_APPLICABLE}, "
                "and a non-empty reason. "
                "lease_findings, evidence_findings, red_flags and missing_information "
                "are arrays of strings (may be empty). "
                "reasoning_summary and recommended_action are non-empty strings."
            ),
        )

        verdict = self._parse_and_validate_review(raw, dispute_id)
        self.responsibility_reviews[dispute_id] = json.dumps(verdict)
        self.review_count = self.review_count + 1

        # state change
        d = json.loads(self.disputes[dispute_id])
        d["status"] = DECISION_TO_STATUS.get(verdict["decision"], "UNDER_CONSENSUS_REVIEW")
        self.disputes[dispute_id] = json.dumps(d)

    @gl.public.write
    def review_appeal(self, appeal_id: str) -> None:
        if appeal_id not in self.appeals:
            _user_err("Appeal does not exist.")
        appeal = self.appeals[appeal_id]
        dispute_id = json.loads(appeal).get("disputeId", "")
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")

        dispute = self.disputes[dispute_id]
        prior = self.responsibility_reviews[dispute_id] if dispute_id in self.responsibility_reviews else "{}"
        evidence = self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"

        prompt = f"""You are reviewing an appeal of a rental deposit dispute decision.

ORIGINAL DISPUTE JSON:
{dispute}

ORIGINAL REVIEW JSON:
{prior}

APPEAL JSON:
{appeal}

ALL EVIDENCE JSON:
{evidence}

Decide whether the original decision should stand, be adjusted, or be escalated.
Return STRICT JSON matching:
{{
  "appeal_decision": "ORIGINAL_DECISION_UPHELD|ORIGINAL_DECISION_ADJUSTED|MORE_EVIDENCE_REQUIRED|ESCALATE_TO_HUMAN_ARBITRATION|APPEAL_REJECTED",
  "new_decision": "FULL_TENANT_REFUND|PARTIAL_TENANT_REFUND|LANDLORD_RETAINS_FULL_DEPOSIT|PARTIALLY_RESOLVED|NEEDS_MORE_EVIDENCE|ESCALATE",
  "new_tenant_refund_amount": number,
  "new_landlord_retained_amount": number,
  "confidence": number,
  "accepted_arguments": ["string"],
  "rejected_arguments": ["string"],
  "reasoning_summary": "string",
  "final_recommendation": "string"
}}"""

        raw = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task=(
                "Produce a single appeal review as STRICT JSON (no prose, no markdown) "
                "matching the schema in the prompt."
            ),
            criteria=(
                "Output MUST be valid JSON parseable by json.loads. "
                "appeal_decision is one of ORIGINAL_DECISION_UPHELD | "
                "ORIGINAL_DECISION_ADJUSTED | MORE_EVIDENCE_REQUIRED | "
                "ESCALATE_TO_HUMAN_ARBITRATION | APPEAL_REJECTED. "
                "new_decision is one of FULL_TENANT_REFUND | PARTIAL_TENANT_REFUND | "
                "LANDLORD_RETAINS_FULL_DEPOSIT | PARTIALLY_RESOLVED | "
                "NEEDS_MORE_EVIDENCE | ESCALATE. "
                "confidence is a number between 0 and 100. "
                "new_tenant_refund_amount and new_landlord_retained_amount are "
                "non-negative numbers. "
                "accepted_arguments and rejected_arguments are arrays of strings "
                "(may be empty). reasoning_summary and final_recommendation are "
                "non-empty strings."
            ),
        )

        verdict = self._parse_and_validate_appeal(raw)
        self.appeal_reviews[appeal_id] = json.dumps(verdict)

        d = json.loads(self.disputes[dispute_id])
        d["status"] = "FINALIZED"
        self.disputes[dispute_id] = json.dumps(d)

    @gl.public.write
    def detect_evidence_conflicts(self, dispute_id: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        evidence = self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"
        prompt = f"""Identify direct contradictions between tenant-side and landlord-side
evidence below. Return STRICT JSON: {{ "conflicts": [{{"a": "string", "b": "string", "note": "string"}}] }}.

EVIDENCE: {evidence}"""

        raw = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task="Identify direct contradictions between tenant-side and landlord-side evidence as STRICT JSON.",
            criteria=(
                "Output MUST be valid JSON: an object with key 'conflicts' which is "
                "an array (possibly empty). Each conflict has fields a, b, note — "
                "all non-empty strings."
            ),
        )
        # store on dispute side-channel
        d = json.loads(self.disputes[dispute_id])
        try:
            d["evidenceConflicts"] = json.loads(_strip_wrappers(raw))
        except Exception:
            d["evidenceConflicts"] = {"conflicts": []}
        self.disputes[dispute_id] = json.dumps(d)

    @gl.public.write
    def interpret_lease_clause(self, dispute_id: str, clause_name: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        dispute = self.disputes[dispute_id]
        lease_id = json.loads(dispute).get("leaseId", "")
        lease = self.leases[lease_id] if lease_id in self.leases else "{}"
        prompt = f"""Interpret the clause '{clause_name}' from the lease for this dispute.
Return STRICT JSON: {{ "clause": "{clause_name}", "interpretation": "string",
"supports_deduction": true|false, "reason": "string" }}.

LEASE: {lease}
DISPUTE: {dispute}"""

        raw = gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task=f"Interpret the lease clause '{clause_name}' as STRICT JSON.",
            criteria=(
                f"Output MUST be valid JSON with fields: clause (== '{clause_name}'), "
                "interpretation (non-empty string), supports_deduction (boolean), "
                "reason (non-empty string)."
            ),
        )
        d = json.loads(self.disputes[dispute_id])
        d.setdefault("clauseInterpretations", {})[clause_name] = _strip_wrappers(raw)
        self.disputes[dispute_id] = json.dumps(d)

    @gl.public.write
    def assess_deduction_item(self, dispute_id: str, deduction_id: str) -> None:
        if dispute_id not in self.disputes:
            _user_err("Dispute does not exist.")
        ledger = self.deduction_ledgers[dispute_id] if dispute_id in self.deduction_ledgers else "[]"
        evidence = self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"
        prompt = f"""Assess only deduction id '{deduction_id}' in the ledger.
Return STRICT JSON: {{ "deduction_id": "{deduction_id}", "responsibility":
"TENANT|LANDLORD|SHARED|UNCLEAR", "approved_amount": number, "reason": "string" }}.

LEDGER: {ledger}
EVIDENCE: {evidence}"""

        gl.eq_principle.prompt_non_comparative(
            lambda: gl.nondet.exec_prompt(prompt),
            task=f"Assess deduction '{deduction_id}' as STRICT JSON.",
            criteria=(
                f"Output MUST be valid JSON with: deduction_id (== '{deduction_id}'), "
                "responsibility in {TENANT,LANDLORD,SHARED,UNCLEAR}, "
                "approved_amount (non-negative number), reason (non-empty string)."
            ),
        )

    # ===== views =========================================================
    @gl.public.view
    def get_lease(self, lease_id: str) -> str:
        return self.leases[lease_id] if lease_id in self.leases else ""

    @gl.public.view
    def get_dispute(self, dispute_id: str) -> str:
        return self.disputes[dispute_id] if dispute_id in self.disputes else ""

    @gl.public.view
    def get_dispute_evidence(self, dispute_id: str) -> str:
        return self.dispute_evidence[dispute_id] if dispute_id in self.dispute_evidence else "[]"

    @gl.public.view
    def get_deduction_ledger(self, dispute_id: str) -> str:
        return self.deduction_ledgers[dispute_id] if dispute_id in self.deduction_ledgers else "[]"

    @gl.public.view
    def get_condition_timeline(self, dispute_id: str) -> str:
        return self.condition_timelines[dispute_id] if dispute_id in self.condition_timelines else "[]"

    @gl.public.view
    def get_responsibility_review(self, dispute_id: str) -> str:
        return self.responsibility_reviews[dispute_id] if dispute_id in self.responsibility_reviews else ""

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> str:
        return self.appeals[appeal_id] if appeal_id in self.appeals else ""

    @gl.public.view
    def get_appeal_review(self, appeal_id: str) -> str:
        return self.appeal_reviews[appeal_id] if appeal_id in self.appeal_reviews else ""

    @gl.public.view
    def get_user_disputes(self, user: str) -> str:
        return self.user_disputes[user] if user in self.user_disputes else "[]"

    @gl.public.view
    def list_disputes(self) -> str:
        ids = []
        for k in self.disputes:
            ids.append(k)
        return json.dumps(ids)

    @gl.public.view
    def list_leases(self) -> str:
        ids = []
        for k in self.leases:
            ids.append(k)
        return json.dumps(ids)

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "leases": int(self.lease_count),
            "disputes": int(self.dispute_count),
            "evidence": int(self.evidence_count),
            "reviews": int(self.review_count),
            "appeals": int(self.appeal_count),
        })

    # ===== internal validation ==========================================
    def _parse_and_validate_review(self, raw: str, dispute_id: str) -> dict:
        cleaned = _strip_wrappers(raw)
        try:
            v = json.loads(cleaned)
        except Exception:
            _user_err("Consensus output was not valid JSON.")

        decision = v.get("decision", "")
        if decision not in ALLOWED_DECISIONS:
            _user_err(f"Invalid decision: {decision}")
        resp = v.get("overall_responsibility", "")
        if resp not in ALLOWED_RESPONSIBILITY:
            _user_err("Invalid overall_responsibility.")
        risk = v.get("risk_level", "MEDIUM")
        if risk not in ALLOWED_RISK:
            risk = "MEDIUM"
            v["risk_level"] = risk

        dep = float(v.get("deposit_amount", 0) or 0)
        refund = float(v.get("tenant_refund_amount", 0) or 0)
        retained = float(v.get("landlord_retained_amount", 0) or 0)
        if refund < 0 or retained < 0:
            _user_err("Refund and retained amounts must not be negative.")
        if dep > 0 and refund + retained - dep > 0.01:
            _user_err("Refund + retained exceeds deposit amount.")

        v["tenant_refund_percent"] = _clamp(v.get("tenant_refund_percent", 0), 0, 100)
        v["landlord_retained_percent"] = _clamp(v.get("landlord_retained_percent", 0), 0, 100)
        v["confidence"] = _clamp(v.get("confidence", 0), 0, 100)

        if not isinstance(v.get("deduction_results", []), list):
            _user_err("deduction_results must be a list.")
        for d in v.get("deduction_results", []):
            if d.get("responsibility") not in ALLOWED_RESPONSIBILITY:
                _user_err("Invalid deduction responsibility.")
            if d.get("result") not in ALLOWED_DEDUCTION_RESULT:
                _user_err("Invalid deduction result.")
        for k in ("lease_findings", "evidence_findings", "red_flags", "missing_information"):
            if not isinstance(v.get(k, []), list):
                v[k] = []
        if not v.get("reasoning_summary", "").strip():
            _user_err("reasoning_summary is required.")
        v["dispute_id"] = dispute_id
        return v

    def _parse_and_validate_appeal(self, raw: str) -> dict:
        cleaned = _strip_wrappers(raw)
        try:
            v = json.loads(cleaned)
        except Exception:
            _user_err("Appeal consensus output was not valid JSON.")
        if v.get("appeal_decision") not in ALLOWED_APPEAL_DECISIONS:
            _user_err("Invalid appeal_decision.")
        if v.get("new_decision") not in ALLOWED_DECISIONS:
            _user_err("Invalid new_decision.")
        v["confidence"] = _clamp(v.get("confidence", 0), 0, 100)
        for k in ("accepted_arguments", "rejected_arguments"):
            if not isinstance(v.get(k, []), list):
                v[k] = []
        if not v.get("reasoning_summary", "").strip():
            _user_err("reasoning_summary is required.")
        return v

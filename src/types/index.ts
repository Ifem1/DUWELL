export type DisputeStatus =
  | "DRAFT" | "FILED" | "EVIDENCE_PENDING" | "UNDER_CONSENSUS_REVIEW"
  | "FULL_TENANT_REFUND" | "PARTIAL_TENANT_REFUND" | "LANDLORD_RETAINS_FULL_DEPOSIT"
  | "NEEDS_MORE_EVIDENCE" | "ESCALATED" | "APPEALED" | "FINALIZED";

export type DisputeType =
  | "DAMAGE_DEDUCTION" | "CLEANING_FEE" | "UNPAID_RENT_DEDUCTION" | "UTILITY_DEDUCTION"
  | "MISSING_ITEM" | "APPLIANCE_DAMAGE" | "FURNITURE_DAMAGE" | "WALL_OR_PAINT_DAMAGE"
  | "WEAR_AND_TEAR" | "SHARED_TENANCY_SPLIT" | "FULL_DEPOSIT_WITHHELD" | "OTHER";

export type Responsibility = "TENANT" | "LANDLORD" | "SHARED" | "UNCLEAR";

export type EvidenceSide = "TENANT" | "LANDLORD" | "NEUTRAL";
export type EvidencePhase = "MOVE_IN" | "DURING_TENANCY" | "MOVE_OUT" | "AFTER_MOVE_OUT";
export type EvidencePrivacy = "PUBLIC" | "REDACTED" | "PRIVATE_HASH_ONLY";

export type Lease = {
  id: string;
  propertyType: string;
  propertyLabel: string;
  tenantWallet: string;
  landlordWallet: string;
  startDate: string;
  endDate: string;
  depositAmount: number;
  currency: string;
  termsSummary: string;
  leaseUri?: string;
  leaseHash?: string;
  clauses: {
    depositReturn?: string;
    damageResponsibility?: string;
    cleaning?: string;
    inventory?: string;
    wearAndTear?: string;
    disputeResolution?: string;
  };
  createdAt: number;
};

export type Dispute = {
  id: string;
  leaseId: string;
  filedBy: string;
  tenantWallet: string;
  landlordWallet: string;
  depositAmount: number;
  amountWithheld: number;
  amountDisputed: number;
  currency: string;
  disputeType: DisputeType;
  summary: string;
  desiredOutcome: string;
  propertyType: string;
  status: DisputeStatus;
  createdAt: number;
  updatedAt: number;
};

export type EvidenceItem = {
  id: string;
  disputeId: string;
  side: EvidenceSide;
  phase: EvidencePhase;
  type: string;
  title: string;
  description: string;
  uri: string;
  hash?: string;
  source: string;
  issuedAt?: string;
  relatedDeductionId?: string;
  linkedTimelineEventId?: string;
  privacy: EvidencePrivacy;
};

export type DeductionCategory =
  | "CLEANING" | "WALL_DAMAGE" | "FLOOR_DAMAGE" | "APPLIANCE_DAMAGE"
  | "FURNITURE_DAMAGE" | "MISSING_ITEM" | "UNPAID_RENT" | "UTILITY_BILL"
  | "KEY_OR_LOCK_REPLACEMENT" | "GARDEN_OR_OUTDOOR_DAMAGE" | "OTHER";

export type DeductionItem = {
  id: string;
  disputeId: string;
  category: DeductionCategory;
  claimedAmount: number;
  currency: string;
  description: string;
  leaseClause?: string;
  evidenceIds: string[];
  tenantResponse?: string;
  landlordResponse?: string;
  alternativeEstimate?: number;
};

export type DeductionResult = {
  deduction_id: string;
  category: string;
  claimed_amount: number;
  approved_amount: number;
  responsibility: Responsibility;
  result: "SUPPORTED" | "PARTIALLY_SUPPORTED" | "NOT_SUPPORTED" | "UNCLEAR" | "NOT_APPLICABLE";
  reason: string;
};

export type ResponsibilityReview = {
  dispute_id: string;
  decision:
    | "FULL_TENANT_REFUND" | "PARTIAL_TENANT_REFUND" | "LANDLORD_RETAINS_FULL_DEPOSIT"
    | "PARTIALLY_RESOLVED" | "NEEDS_MORE_EVIDENCE" | "ESCALATE";
  tenant_refund_amount: number;
  landlord_retained_amount: number;
  deposit_amount: number;
  currency: string;
  tenant_refund_percent: number;
  landlord_retained_percent: number;
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  overall_responsibility: Responsibility;
  deduction_results: DeductionResult[];
  lease_findings: string[];
  evidence_findings: string[];
  red_flags: string[];
  missing_information: string[];
  reasoning_summary: string;
  recommended_action: string;
};

export type AppealReview = {
  appeal_decision: "ORIGINAL_DECISION_UPHELD" | "ORIGINAL_DECISION_ADJUSTED" |
                   "MORE_EVIDENCE_REQUIRED" | "ESCALATE_TO_HUMAN_ARBITRATION" | "APPEAL_REJECTED";
  new_decision: string;
  new_tenant_refund_amount: number;
  new_landlord_retained_amount: number;
  confidence: number;
  accepted_arguments: string[];
  rejected_arguments: string[];
  reasoning_summary: string;
  final_recommendation: string;
};

export type TimelineEvent = {
  id: string;
  type: string;
  at: string;
  description: string;
  party: string;
  evidenceIds: string[];
  notes?: string;
};

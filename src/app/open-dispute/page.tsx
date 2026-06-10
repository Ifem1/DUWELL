"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { openDispute, createLease } from "@/lib/genlayer/write";
import { readLeaseIds, readLease } from "@/lib/genlayer/read";
import { BrassPlateButton } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isContractConfigured } from "@/lib/genlayer/config";
import { Lease } from "@/types";

const schema = z.object({
  // lease (optional new)
  newLease: z.boolean().default(false),
  leaseId: z.string().min(3),
  propertyType: z.string().min(2),
  propertyLabel: z.string().min(2),
  tenantWallet: z.string().min(6),
  landlordWallet: z.string().min(6),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  depositAmount: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  termsSummary: z.string().default(""),
  depositReturn: z.string().default(""),
  damageResponsibility: z.string().default(""),
  cleaning: z.string().default(""),
  inventory: z.string().default(""),
  wearAndTear: z.string().default(""),
  // dispute
  amountWithheld: z.coerce.number().min(0),
  amountDisputed: z.coerce.number().min(0),
  disputeType: z.string().min(1),
  summary: z.string().min(20, "Please describe the dispute (min 20 chars)."),
  desiredOutcome: z.string().min(5),
  filedBy: z.enum(["TENANT", "LANDLORD"]),
});
type FormData = z.infer<typeof schema>;

const DISPUTE_TYPES = [
  "DAMAGE_DEDUCTION","CLEANING_FEE","UNPAID_RENT_DEDUCTION","UTILITY_DEDUCTION",
  "MISSING_ITEM","APPLIANCE_DAMAGE","FURNITURE_DAMAGE","WALL_OR_PAINT_DAMAGE",
  "WEAR_AND_TEAR","SHARED_TENANCY_SPLIT","FULL_DEPOSIT_WITHHELD","OTHER",
];

export default function OpenDisputePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newLease: true, currency: "USD", filedBy: "TENANT", leaseId: `lease_${Date.now()}` },
  });

  const newLease = watch("newLease");
  const leaseId = watch("leaseId");

  useEffect(() => {
    if (!isContractConfigured()) return;
    (async () => {
      const ids = await readLeaseIds();
      const docs = await Promise.all(ids.map((i) => readLease(i)));
      setLeases(docs.filter(Boolean) as Lease[]);
    })();
  }, []);

  useEffect(() => {
    if (!newLease) {
      const l = leases.find((x) => x.id === leaseId);
      if (l) {
        setValue("propertyType", l.propertyType);
        setValue("propertyLabel", l.propertyLabel);
        setValue("tenantWallet", l.tenantWallet);
        setValue("landlordWallet", l.landlordWallet);
        setValue("startDate", l.startDate);
        setValue("endDate", l.endDate);
        setValue("depositAmount", l.depositAmount);
        setValue("currency", l.currency);
      }
    }
  }, [newLease, leaseId, leases, setValue]);

  const onSubmit = async (data: FormData) => {
    setErr(null);
    setSubmitting(true);
    try {
      const now = Date.now();
      if (data.newLease) {
        await createLease(data.leaseId, {
          id: data.leaseId,
          propertyType: data.propertyType,
          propertyLabel: data.propertyLabel,
          tenantWallet: data.tenantWallet,
          landlordWallet: data.landlordWallet,
          startDate: data.startDate,
          endDate: data.endDate,
          depositAmount: data.depositAmount,
          currency: data.currency,
          termsSummary: data.termsSummary,
          clauses: {
            depositReturn: data.depositReturn,
            damageResponsibility: data.damageResponsibility,
            cleaning: data.cleaning,
            inventory: data.inventory,
            wearAndTear: data.wearAndTear,
          },
          createdAt: now,
        });
      }
      const disputeId = `dispute_${now}`;
      await openDispute(disputeId, data.leaseId, {
        id: disputeId,
        leaseId: data.leaseId,
        filedBy: data.filedBy,
        tenantWallet: data.tenantWallet,
        landlordWallet: data.landlordWallet,
        depositAmount: data.depositAmount,
        amountWithheld: data.amountWithheld,
        amountDisputed: data.amountDisputed,
        currency: data.currency,
        disputeType: data.disputeType,
        summary: data.summary,
        desiredOutcome: data.desiredOutcome,
        propertyType: data.propertyType,
        status: "FILED",
        createdAt: now,
        updatedAt: now,
      });
      router.push(`/disputes/${disputeId}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to submit. Check console.");
      setSubmitting(false);
    }
  };

  const next = async (fields: (keyof FormData)[]) => {
    const ok = await trigger(fields);
    if (ok) setStep((s) => s + 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <SetupNotice />

      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.25em] text-[#7B466A] font-bold">Threshold File Wizard</div>
        <h1 className="font-display text-4xl text-paper">Open a Dispute File</h1>
      </div>

      <div className="paper p-2 mb-4 flex flex-wrap text-[10px] font-mono uppercase tracking-widest">
        {["Lease","Parties","Deposit","Dispute","Review"].map((s, i) => (
          <div key={s} className={`flex-1 px-3 py-2 text-center border-r border-ledger/50 last:border-r-0 ${step === i + 1 ? "text-brass" : "text-pin/60"}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="paper p-6 space-y-5">
        {/* Step 1: lease */}
        <div className={step === 1 ? "block space-y-4" : "hidden"}>
          <div className="flex items-center gap-3 text-sm">
            <input type="checkbox" {...register("newLease")} className="w-4 h-4" />
            <label className="!normal-case !tracking-normal text-pin/80">Create a new lease record</label>
          </div>
          {!newLease && leases.length > 0 && (
            <div>
              <label>Existing Lease</label>
              <select {...register("leaseId")}>
                {leases.map((l) => <option key={l.id} value={l.id}>{l.id} — {l.propertyLabel}</option>)}
              </select>
            </div>
          )}
          {(newLease || leases.length === 0) && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Lease ID" reg={register("leaseId")} err={errors.leaseId} />
                <Field label="Property Type" reg={register("propertyType")} err={errors.propertyType} placeholder="apartment, studio…" />
                <Field label="Property Label" reg={register("propertyLabel")} err={errors.propertyLabel} placeholder="redacted address" />
                <Field label="Start Date" reg={register("startDate")} err={errors.startDate} type="date" />
                <Field label="End Date" reg={register("endDate")} err={errors.endDate} type="date" />
              </div>
              <Area label="Lease terms summary" reg={register("termsSummary")} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Area label="Deposit return clause" reg={register("depositReturn")} />
                <Area label="Damage responsibility clause" reg={register("damageResponsibility")} />
                <Area label="Cleaning clause" reg={register("cleaning")} />
                <Area label="Inventory clause" reg={register("inventory")} />
                <Area label="Wear-and-tear clause" reg={register("wearAndTear")} />
              </div>
            </>
          )}
          <div className="flex justify-end">
            <BrassPlateButton type="button" onClick={() => next(["leaseId","propertyType","propertyLabel","startDate","endDate"])}>Next: Parties →</BrassPlateButton>
          </div>
        </div>

        {/* Step 2: parties */}
        <div className={step === 2 ? "block space-y-4" : "hidden"}>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tenant wallet" reg={register("tenantWallet")} err={errors.tenantWallet} placeholder="0x…" />
            <Field label="Landlord wallet" reg={register("landlordWallet")} err={errors.landlordWallet} placeholder="0x…" />
            <div>
              <label>Filed by</label>
              <select {...register("filedBy")}>
                <option value="TENANT">Tenant</option>
                <option value="LANDLORD">Landlord</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="brass-outline px-4 py-2 text-xs">← Back</button>
            <BrassPlateButton type="button" onClick={() => next(["tenantWallet","landlordWallet"])}>Next: Deposit →</BrassPlateButton>
          </div>
        </div>

        {/* Step 3: deposit */}
        <div className={step === 3 ? "block space-y-4" : "hidden"}>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Deposit amount" reg={register("depositAmount")} err={errors.depositAmount} type="number" />
            <Field label="Amount withheld" reg={register("amountWithheld")} err={errors.amountWithheld} type="number" />
            <Field label="Amount disputed" reg={register("amountDisputed")} err={errors.amountDisputed} type="number" />
            <Field label="Currency" reg={register("currency")} err={errors.currency} />
          </div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="brass-outline px-4 py-2 text-xs">← Back</button>
            <BrassPlateButton type="button" onClick={() => next(["depositAmount","amountWithheld","amountDisputed"])}>Next: Dispute →</BrassPlateButton>
          </div>
        </div>

        {/* Step 4: dispute */}
        <div className={step === 4 ? "block space-y-4" : "hidden"}>
          <div>
            <label>Dispute type</label>
            <select {...register("disputeType")}>
              {DISPUTE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <Area label="Dispute summary" reg={register("summary")} err={errors.summary} rows={5} />
          <Area label="Desired outcome" reg={register("desiredOutcome")} err={errors.desiredOutcome} rows={3} />
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(3)} className="brass-outline px-4 py-2 text-xs">← Back</button>
            <BrassPlateButton type="button" onClick={() => next(["disputeType","summary","desiredOutcome"])}>Review →</BrassPlateButton>
          </div>
        </div>

        {/* Step 5: review */}
        <div className={step === 5 ? "block space-y-4" : "hidden"}>
          <div className="paper p-4 text-sm font-mono whitespace-pre-wrap max-h-[400px] overflow-auto">
            {JSON.stringify(watch(), null, 2)}
          </div>
          {err && <div className="clay-outline px-3 py-2 text-sm">{err}</div>}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(4)} className="brass-outline px-4 py-2 text-xs">← Back</button>
            <BrassPlateButton type="submit" disabled={submitting} icon="✓">
              {submitting ? "Filing on-chain…" : "Submit Threshold File"}
            </BrassPlateButton>
          </div>
          <p className="text-[11px] text-pin/70">
            Only submit information you are comfortable making available for review.
            Store sensitive files as hashes, CIDs, or redacted links where appropriate.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({ label, reg, err, ...rest }: any) {
  return (
    <div>
      <label>{label}</label>
      <input {...reg} {...rest} />
      {err && <div className="text-clay text-[11px] mt-1">{err.message}</div>}
    </div>
  );
}
function Area({ label, reg, err, rows = 3, ...rest }: any) {
  return (
    <div>
      <label>{label}</label>
      <textarea rows={rows} {...reg} {...rest} />
      {err && <div className="text-clay text-[11px] mt-1">{err.message}</div>}
    </div>
  );
}

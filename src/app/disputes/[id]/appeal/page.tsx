"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { openAppeal, reviewAppeal } from "@/lib/genlayer/write";
import { BrassPlateButton, BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";

const REASONS = [
  "LEASE_MISINTERPRETED","MOVE_IN_EVIDENCE_IGNORED","MOVE_OUT_EVIDENCE_IGNORED",
  "REPAIR_COST_UNREASONABLE","WEAR_AND_TEAR_MISJUDGED","NEW_EVIDENCE_AVAILABLE",
  "DEDUCTION_SPLIT_UNFAIR","OTHER",
];

const schema = z.object({
  reason: z.string().min(2),
  explanation: z.string().min(20),
  newEvidenceUri: z.string().default(""),
  filedBy: z.enum(["TENANT", "LANDLORD"]),
});

export default function AppealPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { filedBy: "TENANT", reason: "LEASE_MISINTERPRETED" },
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setBusy(true); setErr(null);
    try {
      const aid = `appeal_${Date.now()}`;
      await openAppeal(aid, id, { ...data, id: aid, disputeId: id, createdAt: Date.now() });
      await reviewAppeal(aid);
      router.push(`/disputes/${id}`);
    } catch (e: any) {
      setErr(e?.message || "Appeal failed.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <SetupNotice />
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-clay">Appeal Chamber</div>
          <h1 className="font-display text-4xl text-paper">Challenge the Outcome</h1>
        </div>
        <BrassPlateLink href={`/disputes/${id}`} variant="secondary">← Back to File</BrassPlateLink>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="paper p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label>Filed by</label>
            <select {...register("filedBy")}>
              <option value="TENANT">Tenant</option>
              <option value="LANDLORD">Landlord</option>
            </select>
          </div>
          <div>
            <label>Appeal reason</label>
            <select {...register("reason")}>
              {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label>Why should the outcome change?</label>
          <textarea rows={6} {...register("explanation")} />
          {errors.explanation && <div className="text-clay text-[11px] mt-1">{errors.explanation.message}</div>}
        </div>
        <div>
          <label>Link to new evidence (optional)</label>
          <input {...register("newEvidenceUri")} placeholder="ipfs://… or https://…" />
        </div>
        {err && <div className="clay-outline px-3 py-2 text-sm">{err}</div>}
        <div className="flex justify-end">
          <BrassPlateButton type="submit" disabled={busy} variant="danger" icon="!">
            {busy ? "Reviewing appeal…" : "Submit Appeal for Consensus Review"}
          </BrassPlateButton>
        </div>
        <p className="text-[11px] text-pin/70">
          GenLayer validators will re-read the file with this appeal and return a second structured result.
        </p>
      </form>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  readEvidence, readLedger, readTimeline, readDispute,
} from "@/lib/genlayer/read";
import {
  addEvidence, setDeductionLedger, setConditionTimeline,
} from "@/lib/genlayer/write";
import { EvidenceItem, DeductionItem, TimelineEvent } from "@/types";
import { BrassPlateButton, BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";

const evSchema = z.object({
  side: z.enum(["TENANT", "LANDLORD", "NEUTRAL"]),
  phase: z.enum(["MOVE_IN", "DURING_TENANCY", "MOVE_OUT", "AFTER_MOVE_OUT"]),
  type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(2),
  uri: z.string().default(""),
  hash: z.string().default(""),
  source: z.string().default(""),
  issuedAt: z.string().default(""),
  privacy: z.enum(["PUBLIC", "REDACTED", "PRIVATE_HASH_ONLY"]).default("PUBLIC"),
});
const dedSchema = z.object({
  category: z.string().min(2),
  claimedAmount: z.coerce.number().nonnegative(),
  currency: z.string().default("USD"),
  description: z.string().min(2),
  leaseClause: z.string().default(""),
});
const tlSchema = z.object({
  type: z.string().min(2),
  at: z.string().min(2),
  party: z.string().min(2),
  description: z.string().min(2),
});

export default function EvidencePage() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [ledger, setLedger] = useState<DeductionItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRedactionBanner, setShowRedactionBanner] = useState(false);
  const [pendingPublic, setPendingPublic] = useState<z.infer<typeof evSchema> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("duwell.redactionSeen")) {
      setShowRedactionBanner(true);
    }
  }, []);
  const dismissBanner = () => {
    window.localStorage.setItem("duwell.redactionSeen", "1");
    setShowRedactionBanner(false);
  };

  const ev = useForm<z.infer<typeof evSchema>>({
    resolver: zodResolver(evSchema),
    defaultValues: { side: "TENANT", phase: "MOVE_IN", privacy: "REDACTED", type: "PHOTO" },
  });
  const ded = useForm<z.infer<typeof dedSchema>>({
    resolver: zodResolver(dedSchema),
    defaultValues: { category: "CLEANING", currency: "USD", claimedAmount: 0 },
  });
  const tl = useForm<z.infer<typeof tlSchema>>({ resolver: zodResolver(tlSchema) });

  const refresh = async () => {
    const d = await readDispute(id);
    if (d?.currency) setCurrency(d.currency);
    setEvidence(await readEvidence(id));
    setLedger(await readLedger(id));
    setTimeline(await readTimeline(id));
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  const onAddEvidence = async (data: z.infer<typeof evSchema>) => {
    if (data.privacy === "PUBLIC") {
      setPendingPublic(data);
      return;
    }
    await submitEvidence(data);
  };

  const submitEvidence = async (data: z.infer<typeof evSchema>) => {
    setBusy(true); setErr(null);
    try {
      const eid = `ev_${Date.now()}`;
      await addEvidence(eid, id, { ...data, id: eid, disputeId: id });
      ev.reset({ side: data.side, phase: data.phase, privacy: data.privacy, type: data.type, title: "", description: "", uri: "", hash: "", source: "", issuedAt: "" });
      await refresh();
    } catch (e: any) { setErr(e?.message); }
    finally { setBusy(false); setPendingPublic(null); }
  };

  const onAddDeduction = async (data: z.infer<typeof dedSchema>) => {
    setBusy(true); setErr(null);
    try {
      const item: DeductionItem = {
        id: `ded_${Date.now()}`,
        disputeId: id,
        category: data.category as any,
        claimedAmount: data.claimedAmount,
        currency: data.currency,
        description: data.description,
        leaseClause: data.leaseClause,
        evidenceIds: [],
      };
      const next = [...ledger, item];
      await setDeductionLedger(id, next);
      ded.reset({ category: data.category, currency: data.currency, claimedAmount: 0, description: "", leaseClause: "" });
      await refresh();
    } catch (e: any) { setErr(e?.message); }
    finally { setBusy(false); }
  };

  const onAddTimeline = async (data: z.infer<typeof tlSchema>) => {
    setBusy(true); setErr(null);
    try {
      const event: TimelineEvent = {
        id: `tle_${Date.now()}`,
        type: data.type,
        at: data.at,
        party: data.party,
        description: data.description,
        evidenceIds: [],
      };
      await setConditionTimeline(id, [...timeline, event]);
      tl.reset();
      await refresh();
    } catch (e: any) { setErr(e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <SetupNotice />

      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#3A162B] font-bold">Evidence Room</div>
          <h1 className="font-display text-4xl text-paper">Add to the Threshold File</h1>
        </div>
        <BrassPlateLink href={`/disputes/${id}`} variant="secondary" className="!text-[#3A162B] !border-[#3A162B]">← Back to File</BrassPlateLink>
      </div>

      {showRedactionBanner && (
        <div className="paper p-5 mb-6 border-l-4 border-brass">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-display text-lg text-paper">Before you pin: redact personal information</div>
              <ul className="text-sm text-pin/90 mt-2 space-y-1 list-disc list-inside">
                <li>Cover faces, names, addresses, phone numbers, and account numbers in photos.</li>
                <li>Crop out other tenants&apos; or neighbours&apos; belongings.</li>
                <li>Strip EXIF GPS metadata from photos before uploading.</li>
                <li>Default privacy is <span className="font-mono">REDACTED</span>. Only switch to <span className="font-mono">PUBLIC</span> if you have already redacted the file.</li>
              </ul>
            </div>
            <button onClick={dismissBanner} className="brass-outline px-3 py-2 text-[11px] shrink-0">Got it</button>
          </div>
        </div>
      )}

      {err && <div className="clay-outline px-3 py-2 text-sm mb-4">{err}</div>}

      {pendingPublic && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="paper p-6 max-w-md w-full">
            <div className="font-display text-2xl text-paper">Publish this evidence publicly?</div>
            <p className="text-sm text-pin/90 mt-3">
              You picked <span className="font-mono">PUBLIC</span> for &ldquo;{pendingPublic.title}&rdquo;. This file
              will be readable by anyone forever, including future tenants, landlords, and search engines.
              Make sure you have removed names, addresses, faces and any other personal information.
            </p>
            <p className="text-xs text-pin/70 mt-3">
              If you are not sure, cancel and change privacy to <span className="font-mono">REDACTED</span>.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setPendingPublic(null)} className="brass-outline px-4 py-2 text-xs">Cancel</button>
              <button onClick={() => submitEvidence(pendingPublic)} disabled={busy} className="brass-plate px-4 py-2 text-xs">
                {busy ? "Pinning…" : "Yes, publish publicly"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evidence form */}
        <form onSubmit={ev.handleSubmit(onAddEvidence)} className="paper p-6 space-y-3">
          <div className="font-display text-xl text-paper">Add Evidence</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Side</label>
              <select {...ev.register("side")}>
                <option>TENANT</option><option>LANDLORD</option><option>NEUTRAL</option>
              </select>
            </div>
            <div>
              <label>Phase</label>
              <select {...ev.register("phase")}>
                <option>MOVE_IN</option><option>DURING_TENANCY</option><option>MOVE_OUT</option><option>AFTER_MOVE_OUT</option>
              </select>
            </div>
            <div>
              <label>Type</label>
              <select {...ev.register("type")}>
                {["PHOTO","VIDEO","LEASE_DOCUMENT","INVENTORY_REPORT","CHECK_IN_REPORT","CHECK_OUT_REPORT","MESSAGE_THREAD","EMAIL","REPAIR_INVOICE","CLEANING_INVOICE","RECEIPT","UTILITY_BILL","BANK_TRANSFER","WITNESS_STATEMENT","PROPERTY_MANAGER_NOTE","OTHER"].map((t)=> <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Privacy</label>
              <select {...ev.register("privacy")}>
                <option>REDACTED</option><option>PUBLIC</option><option>PRIVATE_HASH_ONLY</option>
              </select>
              {ev.watch("privacy") === "PUBLIC" && (
                <div className="mt-2 text-[11px] text-clay border border-clay px-2 py-1.5 leading-snug">
                  ⚠ Anyone will be able to view this file forever, including future tenants and search engines.
                </div>
              )}
            </div>
          </div>
          <div><label>Title</label><input {...ev.register("title")} /></div>
          <div><label>Description</label><textarea rows={3} {...ev.register("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label>URI / CID</label><input {...ev.register("uri")} placeholder="ipfs://… or https://…" /></div>
            <div><label>Hash</label><input {...ev.register("hash")} /></div>
            <div><label>Issued at</label><input type="date" {...ev.register("issuedAt")} /></div>
            <div><label>Source</label><input {...ev.register("source")} /></div>
          </div>
          <div className="flex justify-end">
            <BrassPlateButton type="submit" disabled={busy} icon="+">Pin Evidence</BrassPlateButton>
          </div>
        </form>

        {/* Deduction form */}
        <form onSubmit={ded.handleSubmit(onAddDeduction)} className="paper p-6 space-y-3">
          <div className="font-display text-xl text-paper">Add Deduction</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Category</label>
              <select {...ded.register("category")}>
                {["CLEANING","WALL_DAMAGE","FLOOR_DAMAGE","APPLIANCE_DAMAGE","FURNITURE_DAMAGE","MISSING_ITEM","UNPAID_RENT","UTILITY_BILL","KEY_OR_LOCK_REPLACEMENT","GARDEN_OR_OUTDOOR_DAMAGE","OTHER"].map((t)=> <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label>Claimed amount</label><input type="number" {...ded.register("claimedAmount")} /></div>
            <div><label>Currency</label><input {...ded.register("currency")} defaultValue={currency} /></div>
            <div><label>Lease clause referenced</label><input {...ded.register("leaseClause")} /></div>
          </div>
          <div><label>Description</label><textarea rows={3} {...ded.register("description")} /></div>
          <div className="flex justify-end">
            <BrassPlateButton type="submit" disabled={busy} icon="+">Add to Ledger</BrassPlateButton>
          </div>
        </form>

        {/* Timeline form */}
        <form onSubmit={tl.handleSubmit(onAddTimeline)} className="paper p-6 space-y-3 lg:col-span-2">
          <div className="font-display text-xl text-paper">Add Timeline Event</div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label>Type</label>
              <select {...tl.register("type")}>
                {["LEASE_SIGNED","DEPOSIT_PAID","MOVE_IN_INSPECTION","MOVE_IN_PHOTO_UPLOADED","ISSUE_REPORTED_DURING_TENANCY","REPAIR_REQUESTED","REPAIR_COMPLETED","MOVE_OUT_NOTICE","MOVE_OUT_INSPECTION","MOVE_OUT_PHOTO_UPLOADED","DEDUCTION_NOTICE_SENT","TENANT_OBJECTED"].map((t)=> <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label>When</label><input type="date" {...tl.register("at")} /></div>
            <div><label>Party</label><input {...tl.register("party")} placeholder="Tenant / Landlord" /></div>
            <div><label>Description</label><input {...tl.register("description")} /></div>
          </div>
          <div className="flex justify-end">
            <BrassPlateButton type="submit" disabled={busy} icon="+">Add Event</BrassPlateButton>
          </div>
        </form>
      </div>

      {/* Existing items */}
      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="paper p-5">
          <div className="font-display text-lg text-paper mb-3">Evidence on file ({evidence.length})</div>
          {evidence.length === 0 ? <Empty msg="No evidence pinned yet." /> :
            evidence.map((e) => (
              <div key={e.id} className="border-b border-ledger/40 py-2 text-sm">
                <span className="font-mono text-[10px] text-pin/60">{e.side}·{e.phase}·{e.type}</span>{" "}
                <span className="font-display">{e.title}</span>
              </div>
            ))
          }
        </div>
        <div className="paper p-5">
          <div className="font-display text-lg text-paper mb-3">Ledger ({ledger.length})</div>
          {ledger.length === 0 ? <Empty msg="No deductions yet." /> :
            ledger.map((d) => (
              <div key={d.id} className="border-b border-ledger/40 py-2 text-sm flex justify-between">
                <span>{d.category}</span>
                <span className="font-mono">{d.currency} {d.claimedAmount}</span>
              </div>
            ))
          }
        </div>
      </section>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-sm text-pin/60 italic">{msg}</div>;
}

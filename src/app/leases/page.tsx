"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { readLeaseIds, readLease } from "@/lib/genlayer/read";
import { createLease } from "@/lib/genlayer/write";
import { Lease } from "@/types";
import { BrassPlateButton, BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isContractConfigured } from "@/lib/genlayer/config";

const schema = z.object({
  id: z.string().min(3),
  propertyType: z.string().min(2),
  propertyLabel: z.string().min(2),
  tenantWallet: z.string().min(6),
  landlordWallet: z.string().min(6),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  depositAmount: z.coerce.number().positive(),
  currency: z.string().default("USD"),
  termsSummary: z.string().default(""),
  leaseUri: z.string().default(""),
  leaseHash: z.string().default(""),
});

export default function LeasesPage() {
  const [items, setItems] = useState<Lease[] | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { id: `lease_${Date.now()}`, currency: "USD" },
  });

  const refresh = async () => {
    if (!isContractConfigured()) { setItems([]); return; }
    const ids = await readLeaseIds();
    const docs = await Promise.all(ids.map((i) => readLease(i)));
    setItems(docs.filter(Boolean) as Lease[]);
  };
  useEffect(() => { refresh(); }, []);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setBusy(true); setErr(null);
    try {
      await createLease(data.id, { ...data, clauses: {}, createdAt: Date.now() });
      reset({ id: `lease_${Date.now()}`, currency: "USD" });
      setShow(false);
      await refresh();
    } catch (e: any) { setErr(e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <SetupNotice />
      <div className="flex justify-between items-end mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#3A162B] font-bold">Lease Vault</div>
          <h1 className="font-display text-4xl text-paper">Leases on record</h1>
        </div>
        <BrassPlateButton onClick={() => setShow((s) => !s)} icon="+">{show ? "Close" : "Add Lease"}</BrassPlateButton>
      </div>

      {show && (
        <form onSubmit={handleSubmit(onSubmit)} className="paper p-6 mb-6 grid sm:grid-cols-3 gap-4">
          {([
            ["id","Lease ID"], ["propertyType","Property Type"], ["propertyLabel","Property Label"],
            ["tenantWallet","Tenant Wallet"], ["landlordWallet","Landlord Wallet"],
            ["startDate","Start Date","date"], ["endDate","End Date","date"],
            ["depositAmount","Deposit Amount","number"], ["currency","Currency"],
            ["leaseUri","Lease URI"], ["leaseHash","Lease Hash"],
          ] as const).map(([k, l, type]) => (
            <div key={k}>
              <label>{l}</label>
              <input type={type || "text"} {...register(k as any)} />
              {(errors as any)[k] && <div className="text-clay text-[11px] mt-1">{(errors as any)[k].message}</div>}
            </div>
          ))}
          <div className="sm:col-span-3"><label>Terms summary</label><textarea rows={3} {...register("termsSummary")} /></div>
          {err && <div className="sm:col-span-3 clay-outline px-3 py-2 text-sm">{err}</div>}
          <div className="sm:col-span-3 flex justify-end">
            <BrassPlateButton type="submit" disabled={busy} icon="✓">{busy ? "Storing…" : "Save Lease"}</BrassPlateButton>
          </div>
        </form>
      )}

      {items === null ? (
        <div className="paper p-8">Loading…</div>
      ) : items.length === 0 ? (
        <div className="paper p-10 text-center">
          <div className="font-display text-2xl text-paper">No leases yet.</div>
          <p className="text-sm text-pin/80 mt-1">Add a lease to anchor disputes against on-chain terms.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((l) => (
            <div key={l.id} className="paper p-5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-pin/60">#{l.id}</div>
              <div className="font-display text-xl text-paper mt-1">{l.propertyLabel}</div>
              <div className="text-xs text-pin/80 mt-1">{l.propertyType} · {l.startDate} → {l.endDate}</div>
              <div className="font-mono text-sm mt-3">{l.currency} {l.depositAmount}</div>
              <div className="mt-4">
                <BrassPlateLink href={`/open-dispute`} variant="secondary">Open dispute on this lease</BrassPlateLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

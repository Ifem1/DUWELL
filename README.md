# Duwell — GenLayer Rental Deposit Dispute Resolver

A premium rental deposit dispute resolution layer powered by GenLayer consensus.

> Deposit disputes resolved through evidence and consensus.

## Stack

- Next.js 15 (App Router) · TypeScript strict
- Tailwind CSS · custom "Threshold Ledger" UI
- GenLayer JS SDK `1.2+` · GenLayer Studionet
- React Hook Form + Zod
- Intelligent contract: `contracts/Duwell.py`

## Setup

```bash
npm install
cp .env.local.example .env.local
# Deploy contracts/Duwell.py to GenLayer Studionet, then fill the address in .env.local
npm run dev
```

If `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` is empty, the app shows a setup notice
and does not fake any on-chain data. Every dispute, evidence pin, ledger row,
timeline event, settlement seal and appeal you see comes from a real user
submission stored in the `Duwell` contract.

## Why GenLayer

Whether a wall mark is wear-and-tear, whether move-in photos contradict the
landlord's claim, and whether a cleaning invoice is reasonable are non-deterministic
judgements. The `judge_responsibility` and `review_appeal` contract entry points
use `gl.eq_principle.prompt_comparative` to reach validator consensus on a strict,
schema-validated JSON verdict — then store that verdict on-chain and change the
dispute's state accordingly.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Threshold Split hero, Evidence Corridor, real disputes preview |
| `/disputes` | Building-directory plaque board |
| `/disputes/[id]` | Threshold File: lease beam, twin walls, ledger, timeline, consensus, seal |
| `/disputes/[id]/evidence` | Pin evidence, add deductions, log timeline events |
| `/disputes/[id]/appeal` | Open and trigger GenLayer appeal review |
| `/open-dispute` | Threshold File wizard |
| `/leases` | Lease Vault |

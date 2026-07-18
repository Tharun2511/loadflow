# LoadFlow — Freight Brokerage Operations Suite

An operations platform for a freight brokerage that connects **shippers**, **brokers**, and **carriers**. Brokers post loads, assign carriers, negotiate/confirm rates, and track shipments from pickup to delivery — with automated compliance checks that block dispatching to carriers with lapsed insurance or authority (a real broker liability).

---

## ▶︎ Live demo & login

**Live app:** https://loadflow-app.vercel.app/

**Every account below uses the password `password123`.** Log in at `/login`. No signup needed to review — just use these seeded accounts (you can also register a brand-new org from the landing page).

| # | Role | Email | What this account can do |
|---|------|-------|--------------------------|
| 1 | **Broker Admin** | `broker@test.com` | Post loads, assign carriers, confirm rates, override compliance, manage staff/roles |
| 2 | Broker Dispatcher | `dispatcher@test.com` | Custom limited role — assign + confirm only, **no** override / staff (use it to see RBAC in action) |
| 3 | **Carrier Admin** | `carrier@test.com` | Swift Delivery (compliant) — accept/decline, update status, POD, edit compliance |
| 4 | Carrier Dispatch | `dispatch@test.com` | Accept/decline loads only |
| 5 | Carrier Driver | `driver@test.com` | Update status + upload POD only |
| 6 | Carrier (non-compliant) | `budget@test.com` | Budget Movers — **expired insurance**; assigning it demonstrates auto-flagging |
| 7 | **Shipper** | `shipper@test.com` | Sees only their own shipments + delivery proof |

---

## ✅ 5-minute reviewer tour

A guided path that touches every key capability. Two browser windows (one broker, one carrier) makes it smoother.

1. **See compliance blocking (the core safety feature).**
   Log in as `broker@test.com`. On the **Load Board**, post a load (e.g. Seattle → Denver, Van, General), then **assign it to "Budget Movers."** → It is instantly **flagged and blocked**, with the exact reason (expired insurance / inactive authority / wrong equipment) shown in the red **Compliance Alerts** panel. The load cannot progress until resolved.

2. **Run a clean load through its lifecycle.**
   Assign the seeded **"Los Angeles → Dallas"** load to **"Swift Delivery Carriers"** → no flag (Swift is compliant). Then as `carrier@test.com`: **Accept** the load → **propose a rate**. Back as `broker@test.com`: **Confirm Rate**. The carrier can then advance Dispatched → In Transit → Delivered.

3. **Proof of delivery.**
   On the seeded **"Miami → Atlanta"** load (already in transit), as the carrier mark it **Delivered** and **Upload POD** (any image/PDF). Then log in as `shipper@test.com` — the shipper sees the status and can **download the delivery proof**, but nothing else.

4. **RBAC is real, not UI hiding.**
   As `broker@test.com` open **Team Settings** and build a custom role by ticking permissions from the catalog. Then log in as `dispatcher@test.com` — the Team Settings link and override buttons are gone, **and the server rejects those actions if called directly** (denied attempts are logged as `[RBAC DENIED]`).

5. **Audit trail.**
   As any broker/carrier user, open **Audit Log** — every load state change is timestamped and attributed to the user who made it.

---

## What this project demonstrates

- **RBAC built as a system, not hardcoded roles.** Each Broker/Carrier org has an Admin who composes **custom roles from a fixed permission catalog**; the code checks *permissions*, never role names. Enforcement is **server-side** on every action — a lower-privileged account hitting a restricted operation directly is blocked, not just hidden in the UI. Includes **org scoping** (brokers never see carrier data or vice-versa) and **object-level scoping** (a carrier sees only its own loads; a shipper only its own).
- **A compliance engine with real teeth.** Assigning a carrier auto-flags the load if insurance is expired, MC/DOT authority isn't active, or the carrier isn't approved for the load's equipment/commodity — and **blocks the load from progressing past "Carrier Assigned"** until a broker with override permission resolves it.
- **A proper load lifecycle.** `POSTED → CARRIER_ASSIGNED → RATE_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → POD_VERIFIED → CLOSED`, every transition validated, timestamped, and attributed (audit trail).
- **Versioned rate confirmations**, **carrier compliance CRUD**, **POD upload/viewer**, **insurance-expiry alerts**, and **per-role dashboards** for broker, carrier, and shipper.

### Feature checklist
**Must-haves (all done):** 3-account auth · system-level RBAC with server enforcement + org/object scoping · load CRUD + state machine + audit trail · carrier compliance CRUD · versioned rate confirmations · compliance auto-flagging that blocks progression · per-account dashboards · broker load-board search/filter.
**Stretch (all done):** POD upload/viewer · compliance expiry renewal alerts · audit log viewer.

---

## Tech stack (and why)

| Layer | Choice | One-line reason |
|-------|--------|-----------------|
| Framework | **Next.js 16 (App Router) + React 19** | One codebase for UI + server; Server Actions give a typed, server-enforced "API" without hand-writing routes. |
| Auth | **NextAuth (Credentials + JWT)** | Batteries-included session/JWT; permissions ride in the token so every server action can authorize cheaply. |
| DB / ORM | **PostgreSQL (Neon) + Prisma** | Relational data (orgs → roles → users, loads → rates/audit) maps cleanly; Neon is serverless-friendly for Vercel. |
| Styling | **Tailwind CSS v4** | Fast, consistent dark UI. |

> Note: In Next.js 16, Middleware was renamed **Proxy** — coarse route protection lives in [`proxy.ts`](proxy.ts). Server Actions are the real enforcement layer.

### Where to look in the code
- Permission catalog & role bundles — [`lib/permissions.ts`](lib/permissions.ts)
- Server-side auth guards (`requirePermission`, org/object scoping, denied logging) — [`lib/rbac.ts`](lib/rbac.ts)
- Load lifecycle, compliance flagging, rate versioning, POD — [`app/actions/load.ts`](app/actions/load.ts)
- Compliance CRUD — [`app/actions/compliance.ts`](app/actions/compliance.ts)
- Schema — [`prisma/schema.prisma`](prisma/schema.prisma)

### Data model
- **Organization** (BROKER | CARRIER) → **Role** (name + JSON permissions) → **User** (also SHIPPER, org-less).
- **CarrierCompliance** — insurance expiry, MC/DOT status, approved equipment & commodity types (one per carrier org).
- **Load** — origin/destination, equipment/commodity, status, `complianceFlag` + reason, `carrierAccepted`, links to shipper + broker org + carrier org.
- **RateConfirmation** — versioned (`@@unique([loadId, version])`) base rate + accessorials.
- **LoadAuditLog** — old→new status, who, when. **Pod** — base64 proof-of-delivery, one per load.

---

## Run it locally

Prereqs: Node 20+, a PostgreSQL connection string (a free [Neon](https://neon.tech) DB works).

```bash
npm install

# create .env in the project root:
#   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
#   NEXTAUTH_URL="http://localhost:3000"
#   NEXTAUTH_SECRET="any-long-random-string"

npx prisma migrate deploy   # or: npx prisma db push
npm run db:seed             # loads the demo accounts above
npm run dev                 # http://localhost:3000
```

## Deploy (Vercel + Neon)
1. Import the repo into Vercel.
2. Set env vars: `DATABASE_URL` (Neon), `NEXTAUTH_URL` (your deployed URL), `NEXTAUTH_SECRET`.
3. `postinstall` runs `prisma generate`. Apply the schema once against the prod DB (`prisma migrate deploy` or `prisma db push`), then `npm run db:seed` for demo data.

---

## How I used my AI coding tool
Built with **Claude Code**:
- **Explore before editing** — the agent read the whole codebase and the bundled `node_modules/next/dist/docs` first (Next.js 16 has real breaking changes, e.g. Middleware → Proxy) so changes matched the actual framework version, not stale training data.
- **Plan, then execute** — agreed a written plan (schema → actions → UI → seed → README) and worked it top-down so the data layer was stable before the UI consumed it.
- **Review habit** — reviewed each server action for the authorization check *first* (permission + org + object scope) before the UI, since server-side enforcement is the heart of the brief; verified the build and the end-to-end flows against the seeded accounts.
- Commits are small and scoped so the history reads as a build log.

## Assumptions
- **Permission catalog extended by 2 keys** beyond the brief's list: `load.accept_decline` (carrier accept/decline) and `compliance.manage` (edit the compliance record). The brief describes both behaviors but its example catalog had no permission for them, so I added them to keep everything permission-driven rather than role-name-driven.
- POD files are demo-sized (≤3 MB) and stored inline as base64 — deliberate, to stay serverless-safe and dependency-free. Real deployments would use object storage (S3/R2) with signed URLs.
- A carrier is a single compliance entity (one record per carrier org), not per-truck. Shippers are individuals with no sub-roles, per the brief.

## What's incomplete / would do with more time
- **Automated tests** — the enforcement layer deserves unit/integration tests (permission matrix, cross-org access rejection, state-machine guards). Verified manually for this submission.
- **Object storage for POD** instead of base64-in-DB; inline PDF/image preview instead of open-in-new-tab.
- **Notifications** — email/in-app alerts on assignment, flag, and upcoming insurance expiry (currently in-dashboard only).
- **Rate negotiation thread**, **load edit/delete + archival**, richer load-board filters, and **per-truck equipment / line-item accessorials**.

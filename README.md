# LoadFlow — Freight Brokerage Operations Suite

An operations platform for a freight brokerage that connects **shippers**, **brokers**, and **carriers**. Brokers post loads, assign carriers, negotiate/confirm rates, and track shipments from pickup to delivery — with automated compliance checks that block dispatching to carriers with lapsed insurance or authority (a real broker liability).

The centrepiece is a **real RBAC system**: Broker and Carrier organizations each have an Admin who builds custom roles from a fixed permission catalog, and the application checks *permissions*, never role names. Enforcement is at the server (API) layer, not just hidden in the UI.

---

## Tech stack (and why)

| Layer | Choice | One-line reason |
|-------|--------|-----------------|
| Framework | **Next.js 16 (App Router) + React 19** | One codebase for UI + server; Server Actions give a typed, server-enforced "API" without hand-writing routes. |
| Auth | **NextAuth (Credentials + JWT)** | Batteries-included session/JWT handling; permissions ride in the token so every server action can authorize cheaply. |
| DB / ORM | **PostgreSQL (Neon) + Prisma** | Relational data (orgs → roles → users, loads → rates/audit) maps cleanly; Neon is serverless-friendly for Vercel. |
| Styling | **Tailwind CSS v4** | Fast, consistent dark UI. |

> Note: In Next.js 16, Middleware was renamed **Proxy** — route protection lives in [`proxy.ts`](proxy.ts). Server Actions are the real enforcement layer; the proxy only does coarse route-type routing.

---

## Features

### Must-haves (all implemented)
- **Auth for 3 account types** — Broker (org), Carrier (org), Shipper (individual).
- **RBAC built as a system**
  - Fixed permission catalog in [`lib/permissions.ts`](lib/permissions.ts); roles are bundles of permission keys.
  - Admins build **custom roles** from the catalog via the UI (Team Settings) — e.g. broker "Dispatcher", carrier "Driver" vs "Carrier Dispatch".
  - **Server-side enforcement** on every mutation via `requirePermission()` in [`lib/rbac.ts`](lib/rbac.ts) — hitting an action without the permission is rejected regardless of UI.
  - **Org scoping** (broker staff never see carrier data or vice-versa) and **object-level scoping** (carriers see only their own loads; shippers only their own).
  - **Bootstrap**: the first Admin is created by org registration; all other staff are invited by that Admin.
  - **Permission-denied logging** — every denied attempt is logged (`[RBAC DENIED] …`, captured by Vercel logs).
- **Load CRUD + full state machine + audit trail** — `POSTED → CARRIER_ASSIGNED → RATE_CONFIRMED → DISPATCHED → IN_TRANSIT → DELIVERED → POD_VERIFIED → CLOSED`; every transition is timestamped and attributed.
- **Carrier compliance record CRUD** — carriers edit insurance expiry, MC/DOT authority, approved equipment & commodity types.
- **Rate confirmation with versioning** — each proposal is a new version; confirmed loads keep the exact version agreed.
- **Compliance auto-flagging** — assigning a carrier auto-flags the load if insurance is expired, authority isn't ACTIVE, or the carrier isn't approved for the load's equipment/commodity. Flagged loads **cannot progress past "Carrier Assigned"** until a broker with `load.override_compliance_flag` resolves it.
- **Dashboards per account type** — Broker (load board + search/filter + compliance alerts), Carrier (assigned loads + accept/decline + status actions + compliance record), Shipper (own load status + delivery confirmation).

### Stretch (all implemented)
- **POD upload/viewer** — carriers upload a proof-of-delivery file on delivered loads (stored as a base64 data-URL in the DB, so it works on serverless with no object storage); brokers and shippers can view it.
- **Compliance expiry renewal alerts** — the carrier dashboard banners expired / expiring-soon (≤30 days) insurance and inactive authority.
- **Audit log viewer** — an org-scoped `/dashboard/audit` table of every attributed state change.

---

## Data model (Prisma) — [`prisma/schema.prisma`](prisma/schema.prisma)
- **Organization** (BROKER | CARRIER) → **Role** (name + JSON permissions) → **User** (also SHIPPER, org-less).
- **CarrierCompliance** — insurance expiry, MC/DOT status, approved equipment & commodity types (one per carrier org).
- **Load** — origin/destination, equipment/commodity, status, `complianceFlag` + reason, `carrierAccepted`, links to shipper + broker org + carrier org.
- **RateConfirmation** — versioned (`@@unique([loadId, version])`) base rate + accessorials.
- **LoadAuditLog** — old→new status, who, when.
- **Pod** — base64 data-URL proof-of-delivery, one per load.

### How compliance flagging works
`assignCarrier` calls `evaluateCompliance(compliance, load)` ([`app/actions/load.ts`](app/actions/load.ts)), which returns a human-readable reason when the carrier fails any of: **active authority**, **unexpired insurance**, **approved equipment**, **approved commodity**. The reason is stored on the load and surfaced in the broker Alerts panel and the carrier's block notice. Rate proposal/confirmation and all status transitions refuse to run while `complianceFlag` is true.

---

## Run it locally

Prereqs: Node 20+, a PostgreSQL connection string (a free [Neon](https://neon.tech) DB works).

```bash
# 1. Install
npm install

# 2. Configure environment — create .env in the project root:
#    DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
#    NEXTAUTH_URL="http://localhost:3000"
#    NEXTAUTH_SECRET="any-long-random-string"

# 3. Apply schema + seed demo data
npx prisma migrate deploy   # or: npx prisma db push
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:3000
```

### Seeded test accounts (password: `password123`)
| Role | Email | Notes |
|------|-------|-------|
| Broker Admin | `broker@test.com` | full broker permissions |
| Broker Dispatcher | `dispatcher@test.com` | custom role: assign + confirm, **no** override/staff |
| Carrier Admin | `carrier@test.com` | Swift (compliant) |
| Carrier Dispatch | `dispatch@test.com` | accept/decline only |
| Carrier Driver | `driver@test.com` | status update + POD only |
| Carrier Admin | `budget@test.com` | Budget Movers (**expired insurance**, demonstrates flagging) |
| Shipper | `shipper@test.com` | Acme Corp |

**Try the RBAC:** log in as `dispatcher@test.com` — the "Team Settings" link and override buttons disappear, and the corresponding server actions reject the request (check the server console for `[RBAC DENIED]`).

**Try the compliance flag:** as a broker, assign the posted "Los Angeles → Dallas" load to **Budget Movers** → it auto-flags and cannot progress; assign it to **Swift** instead → clean.

---

## Deploy (Vercel + Neon)
1. Push the repo to GitHub and import it into Vercel.
2. Set env vars in Vercel: `DATABASE_URL` (Neon), `NEXTAUTH_URL` (your deployed URL), `NEXTAUTH_SECRET`.
3. `postinstall` runs `prisma generate` automatically. Apply the schema once against the prod DB (`npx prisma migrate deploy` locally against `DATABASE_URL`, or `prisma db push`), then seed if you want demo data.
4. Deploy. Done.

---

## How I used my AI coding tool
Built with **Claude Code**. Working style:
- **Explore before editing** — had the agent read the whole existing codebase and the bundled `node_modules/next/dist/docs` first (Next.js 16 has real breaking changes, e.g. Middleware → Proxy) so changes matched the actual framework version rather than stale training data.
- **Plan, then execute** — agreed a written plan (schema → actions → UI → seed → README) and worked it top-down so the data layer was stable before the UI consumed it.
- **Review habit** — I reviewed each server action for the authorization check *first* (permission + org + object scope) before looking at UI, since the brief's core is server-side enforcement, and verified the build + the end-to-end flows against the seeded accounts.
- Commits are small and scoped so the history reads as a build log.

---

## Assumptions
- **Permission catalog extended by 2 keys** beyond the brief's list: `load.accept_decline` (carrier accept/decline) and `compliance.manage` (edit the compliance record). The brief describes both behaviors ("Carrier Dispatch (accept/decline)", carriers managing compliance) but its example catalog had no permission for them, so I added them to keep everything permission-driven rather than role-name-driven.
- POD files are demo-sized (≤3 MB) and stored inline as base64 — deliberate, to stay serverless-safe and dependency-free. Real deployments would use object storage (S3/R2) with signed URLs.
- A carrier is a single compliance entity (one record per carrier org), not per-truck.
- Shippers are individuals with no sub-roles, per the brief.

## What's incomplete / would do with more time
- **Automated tests** — the enforcement layer deserves unit/integration tests (permission matrix, cross-org access rejection, state-machine guards). Verified manually for this submission.
- **Object storage for POD** instead of base64-in-DB; PDF/image inline preview modal instead of open-in-new-tab.
- **Notifications** — email/in-app alerts on assignment, flag, and upcoming insurance expiry (currently surfaced in-dashboard only).
- **Rate negotiation thread** — counter-offers are modeled via versions but there's no back-and-forth UI beyond propose/confirm.
- **Load edit/delete** and soft-delete/archival; richer load-board filters (lane, carrier, date range).
- **Per-truck equipment**, commodity sub-types, and accessorial line-items instead of a single number.

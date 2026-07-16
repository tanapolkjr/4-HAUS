# 4 HAUS — Product Import Decision App

Internal tool for 4 HAUS Co., Ltd. (4 users). One question drives everything:
**is this product worth importing?**

- **Frontend** — React 18 + TypeScript + TailwindCSS (Vite)
- **Backend** — Supabase (PostgreSQL, Auth, Storage)
- **Hosting** — Vercel

## 1. Set up Supabase (once)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste and run `supabase/migrations/0001_init.sql`.
   This creates the 6 tables, triggers, row-level security, and the
   `product-media` storage bucket.
3. Create the 4 team logins: **Authentication → Users → Add user**
   (email + password, confirm email = on). On each person's first sign-in,
   a profile row is created automatically in `public.users`.
4. Copy the **Project URL** and **anon public key** from
   **Settings → API**.

## 2. Run locally

```bash
cp .env.example .env    # paste the URL and anon key
npm install
npm run dev             # http://localhost:5173
```

## 3. Deploy to Vercel

1. Push this folder to a Git repository.
2. In Vercel: **New Project → Import** the repo (framework preset: Vite).
3. Add the two environment variables from `.env`.
4. Deploy. `vercel.json` already handles SPA routing.

## How the pipeline works (automation over manual updates)

`products.status` is never edited by hand — it is derived after every save:

| Status | Reached when |
|---|---|
| Draft | product created |
| Under Evaluation | hero photo added and work started (a cost estimate or any scores) |
| Scored | all 10 criteria scored |
| Decision Pending | fully scored **and** costed |
| Done | a decision was recorded |

`products.decision_status` is synced from `evaluations` by a database trigger.

## Key business rules in code

- **Cost formulas** — `src/lib/calculations.ts` (`calculateCosts`), per-unit THB.
- **Overall score** — Σ(score × weight) ÷ 22, one decimal.
- **Recommendation** — score + gross-margin table (`suggestRecommendation`);
  a suggestion only, never auto-applied.
- **"Waiting" → "Testing" rename** (proposed, not yet approved) — change one
  label in `DECISION_LABEL` in `src/lib/constants.ts`. Stored values stay stable.
- **Cost history** — append-only; every save is a new row.
- **Draft-only delete** — products with history can't be deleted; factories
  with products can't be deleted.

## Folder structure

```
src/
  lib/         pure logic: types, constants, calculations, formatting (no React)
  api/         one typed Supabase data-access module per table (no UI)
  hooks/       auth session, theme, toasts, fetch
  components/  ui/ = reusable primitives · layout/ = shell, sidebar, ⌘K palette
  features/    one folder per module: dashboard, factories, product, compare,
               reports, settings, auth
```

Adding a future module = a new `features/` folder; nothing else moves.

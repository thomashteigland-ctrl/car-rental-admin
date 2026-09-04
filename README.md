# Car rental admin

Internal fleet admin (Vite + React + TypeScript) backed by Supabase.

## Local setup

1. Copy env:

```powershell
Copy-Item .env.example .env
```

Fill in:

```env
PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="your-anon-or-publishable-key"
```

2. In Supabase Dashboard → **API → Exposed schemas**, include `rental`.

3. In the SQL Editor, run [`supabase/grants.sql`](supabase/grants.sql) once (anon needs `USAGE` on the `rental` schema).

4. Start:

```powershell
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Vercel (push to main)

This repo root **is** the Vite app (no Next.js / Prisma).

1. Project already linked to this GitHub repo — push `main` to deploy.
2. In Vercel → **Settings → Environment Variables**, set for Production (and Preview if you want). Any of these name pairs work:
   - `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` (preferred)
   - or `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. If the project still has old Next.js settings, set:
   - Framework Preset: **Vite** (or leave `vercel.json` to drive it)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Redeploy after saving env vars (Vite bakes these in at **build** time). You can remove unused `DATABASE_URL` / `DIRECT_URL` if they are still set.

`vercel.json` already configures SPA routing so React Router deep links work.

## What you can do

- **Dashboard** — fleet value, weekly earnings, month P&L
- **Market** — opens the separate FINN scrape app (`PUBLIC_MARKET_APP_URL`)
- **Cars / Bookings / Calendar / Service / Reports** — fleet ops
- **Settings** — categories, reload from Supabase, JSON backup

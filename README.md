# Car rental admin

Internal admin for rental fleet ops and FINN.no market pricing (Next.js / TypeScript / Prisma / Supabase).

## Stack

- Next.js (App Router) + TypeScript + React
- Supabase Postgres (`rental` schema) via Prisma
- On-demand FINN scrape via `POST /api/scrape` (needs longer `maxDuration` on Vercel)

## Local setup

1. In Supabase SQL editor (once):

```sql
create schema if not exists rental;
```

2. Copy env and set **pooler** URIs from Supabase → Project Settings → Database  
   (Transaction pooler `:6543` for `DATABASE_URL`, Session pooler `:5432` for `DIRECT_URL`).

```bash
cp .env.example .env
# set DATABASE_URL + DIRECT_URL
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel

This repo root **is** the Next.js app (no subdirectory).

1. Import [thomashteigland-ctrl/car-rental-admin](https://github.com/thomashteigland-ctrl/car-rental-admin) in Vercel
2. Set env vars: `DATABASE_URL`, `DIRECT_URL` (same pooler URIs as local)
3. Deploy — `npm run build` runs `prisma migrate deploy` then `next build`

Scrape route `maxDuration` is 300s (`vercel.json`); Hobby plans may time out on long scrapes.

## What you can do

- **Dashboard** — fleet value, weekly earnings, month P&L
- **Market** — FINN price vs km chart, filters, Run scrape
- **Cars / Bookings / Calendar / Service / Reports** — fleet ops

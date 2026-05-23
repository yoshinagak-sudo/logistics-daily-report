# Logistics Daily Report

AI-assisted daily operations log for fleet operators — voice-driven entry, meter-image OCR, and automated compliance checks against Japan's 2024 Improvement Standards Notice (改善基準告示).

## Why it exists

Truck drivers traditionally fill in paper daily reports at the end of long shifts — slow, error-prone, and a compliance liability under the 2024 改善基準告示 (Working Hour Improvement Standards for the trucking industry). This tool lets a driver finish a complete report in under a minute by speaking the day's events into a phone.

## What it does

- **Voice input** — drivers describe their day; the model structures it into the standard daily-report fields
- **Meter OCR** — odometer and fuel-meter photos are read directly; no manual typing
- **Compliance flags** — automatic detection of violations against the 2024 改善基準告示 thresholds (continuous driving time, rest gaps, total work hours)
- **Manager view** — daily / weekly rollups across the fleet

## Stack

- Next.js 16 / React 19 / TypeScript / Tailwind v4
- Speech-to-text and OCR via Gemini API
- PostgreSQL (Supabase)
- Deployable to Vercel

## Status

Demo / reference implementation. The 改善基準告示 rule set is encoded as a small TypeScript module — easy to lift into other transport-compliance workflows.

## Run locally

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY and DATABASE_URL
npx prisma migrate dev
npm run dev
```

---

Built by [Keigo Yoshinaga](https://github.com/yoshinagak-sudo) — Project Lead, Future Strategy Dept @ Butai Farm, a Japanese agricultural and food-logistics business. Part of the in-house operational toolkit running our own fleet.

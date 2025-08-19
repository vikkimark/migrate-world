# Decision Log — Migrate World

## Beachhead (Step 1)
- Primary user: **Students**
- Corridors: **India → Canada**, **Nigeria → Canada**
- Cities: **Ottawa, Toronto**
- Timebox: **6 weeks**
- Success focus:
  - Activation: ≥30% add ≥1 program + ≥1 housing to checklist in 48h
  - Leads: 100 qualified email signups (country + intake + program)
  - Marketing: 12 short videos; 5k views; 100 followers/subscribers
  - Support: public email + auto-reply + AI FAQ live

## Tech Choices
- Frontend: **Next.js (App Router), TypeScript, Tailwind, shadcn**
- Backend: **Supabase (Postgres + Auth)**
- Auth: **Magic link**; redirect to `/checklist`
- DB: public read tables (`schools`, `programs`, `visa_links`); RLS on `checklist_items`
- Deploy: **Vercel CLI** (Git auto-builds disabled)
- Node: **v22** locally; Vercel env vars set for Supabase

## UX Conventions
- Global header with nav + auth status
- “Save to checklist” on **Programs** and **Visa**
- Official visa links only; **not legal advice** disclaimer

## Data Model (v0)
- School, Program, VisaLink, ChecklistItem, User
- Seeded: Ottawa/Toronto schools & programs; India/Nigeria → Canada visa links

## What’s live (end of Day 2)
- Home hero
- Programs (filters + save to checklist)
- Visa (country/purpose filters + save to checklist)
- Signup (magic link) and Checklist (add/toggle/delete)
- Header with auth status

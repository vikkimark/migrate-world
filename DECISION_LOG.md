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

## Day 3 (Shipped)

- Pages:
  - **Housing** (curated links + “Add to checklist”)
  - **Jobs** (curated searches + “Add to checklist”)
  - **Shop** (winter + all-season essentials; Indian/Nigerian groceries; “Add to checklist”)
  - **Start** (lead capture form → Supabase `leads`)

- UX:
  - Header nav: added **Start**, **Jobs**, **Shop**
  - Home hero: clearer value copy; single **Start your plan** CTA (solid black)
  - Toasts: success/error notifications via **sonner**

- Data & Auth:
  - `leads` table created; **RLS** enabled (anon **INSERT** only)
  - Checklist: save from Programs/Visa/Housing/Jobs/Shop

- SEO & Structure:
  - Route metadata (titles/descriptions) standardized (no city/country in titles)
  - **robots.txt** and **sitemap.xml** (now includes `/start`, `/terms`, `/privacy`)
  - **Terms** and **Privacy** pages added; footer with links

- Open items (carry to Week-1 list):
  - Replace `hello@yourdomain.com` with real email
  - Refine visa links (non-study categories) to exact IRCC deep links
  - Add affiliate/partner URLs to Shop
  - Add basic analytics (PostHog) for CTA clicks, signups, saves


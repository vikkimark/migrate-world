-- Minimal schema (extend later)
create table if not exists universities (
  id bigserial primary key,
  name text not null,
  country text not null,
  city text,
  website text,
  created_at timestamptz default now()
);
create index if not exists idx_universities_country on universities(country);

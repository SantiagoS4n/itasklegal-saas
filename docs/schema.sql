-- Supabase schema reference (Postgres).
-- Covers all tables referenced in src/ as of 2026-09-11. If a table gets
-- new columns later, refresh it with the SQL Editor query:
--   select table_name, column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name in (<tables>)
--   order by table_name, ordinal_position;
-- (that query gives columns/types/nullability only — constraints, defaults
-- and indexes below were carried over from the original DDL where known.)

create table public.assistant (
  "ID" bigint generated always as identity not null,
  "Id_document" text null,
  full_name text not null,
  name text null,
  "lastName" text null,
  phone text null,
  "WA" text null,
  email text null,
  date_of_birth date null,
  city text null,
  role text null,
  notified boolean null default false,
  "link_CV" text null,
  "Invoice_amount" numeric null,
  pay_cop numeric null,
  pay_usd numeric null,
  start_date date null,
  firm_id bigint null,
  hour numeric null,
  notes text null,
  refer_by text null,
  contracted text null default 'No'::text,
  "Firm_agreement" text null,
  "VA_agreement" text null,
  constraint Assistant_pkey primary key ("ID"),
  constraint Assistant_firm_id_fkey foreign KEY (firm_id) references law_firm ("ID_number"),
  constraint Assistant_contracted_check check (
    (contracted = any (array['Yes'::text, 'No'::text]))
  )
) TABLESPACE pg_default;

create index IF not exists idx_assistant_contracted on public.assistant using btree (contracted) TABLESPACE pg_default;

create index IF not exists idx_assistant_firm on public.assistant using btree (firm_id) TABLESPACE pg_default;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables below were reconstructed from information_schema.columns only
-- (names/types/nullability), NOT from actual DDL. Primary/foreign keys are
-- inferred from naming convention (ID/ID_number columns, *_id matching
-- another table's PK) and are marked "(inferred)" — verify in the Supabase
-- dashboard before relying on them for constraints/migrations.
-- ─────────────────────────────────────────────────────────────────────────

create table public.bussinescard (
  "ID" bigint generated always as identity not null,
  full_name text null,
  company text null,
  job_title text null,
  email text null,
  phone_office text null,
  phone_fax text null,
  website text null,
  address text null,
  city text null,
  state text null,
  country text null,
  notes text null,
  source_file text null,
  firm_id bigint null,
  constraint bussinescard_pkey primary key ("ID"), -- inferred
  constraint bussinescard_firm_id_fkey foreign key (firm_id) references law_firm ("ID_number") -- inferred
) TABLESPACE pg_default;

create table public.invoice (
  invoice_number text not null,
  firm_id bigint null,
  start_date date null,
  end_date date null,
  invoice_date date null,
  amount numeric null,
  status text null,
  pdf_url text null,
  pdf_path text null,
  constraint invoice_pkey primary key (invoice_number), -- inferred
  constraint invoice_firm_id_fkey foreign key (firm_id) references law_firm ("ID_number") -- inferred
) TABLESPACE pg_default;

create table public.law_firm (
  "ID_number" bigint generated always as identity not null,
  firm_name text not null,
  firm_phone text null,
  email text null,
  address text null,
  notes text null,
  contact_name text null,
  slug text null,
  constraint law_firm_pkey primary key ("ID_number") -- inferred
) TABLESPACE pg_default;

create table public.recipient_alias (
  recipient_raw text not null,
  assistant_id bigint not null,
  created_at timestamp without time zone null default now(),
  constraint recipient_alias_pkey primary key (recipient_raw), -- inferred
  constraint recipient_alias_assistant_id_fkey foreign key (assistant_id) references assistant ("ID") -- inferred
) TABLESPACE pg_default;

create table public.remitly (
  "ID" bigint generated always as identity not null,
  "Date" date null,
  "Recipient" text null,
  assistant_id bigint null,
  "Reference No" text null,
  "Total USD" numeric null,
  "Fee" numeric null,
  "Total Amount" numeric null,
  "Currency" text null,
  "Total Recipient" numeric null,
  "Exchange Rate" numeric null,
  constraint remitly_pkey primary key ("ID"), -- inferred
  constraint remitly_assistant_id_fkey foreign key (assistant_id) references assistant ("ID") -- inferred
) TABLESPACE pg_default;

-- id likely references auth.users(id) (standard Supabase pattern) — not verified.
create table public.user_profile (
  id uuid not null,
  role text not null,
  firm_id bigint null,
  full_name text null,
  created_at timestamp without time zone null default now(),
  active boolean null,
  constraint user_profile_pkey primary key (id), -- inferred
  constraint user_profile_firm_id_fkey foreign key (firm_id) references law_firm ("ID_number") -- inferred
) TABLESPACE pg_default;

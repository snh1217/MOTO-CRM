create extension if not exists pgcrypto;

-- Core user-facing tables (created before centers migration adds center_id).

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vehicle_name text not null,
  vehicle_number text not null,
  mileage_km integer not null,
  customer_name text,
  phone text,
  purchase_date date,
  vin_image_url text,
  engine_image_url text,
  symptom text,
  service_detail text
);

create index if not exists receipts_vehicle_number_idx on receipts (vehicle_number);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_name text not null,
  phone text not null,
  content text not null,
  contacted boolean not null default false,
  note text,
  note_updated_at timestamptz
);

create index if not exists inquiries_created_at_idx on inquiries (created_at desc);
create index if not exists inquiries_contacted_created_at_idx on inquiries (contacted, created_at desc);
create index if not exists inquiries_phone_idx on inquiries (phone);
create index if not exists inquiries_customer_name_idx on inquiries (customer_name);

create extension if not exists pg_trgm;
create index if not exists inquiries_customer_name_trgm_idx
  on inquiries using gin (customer_name gin_trgm_ops);
create index if not exists inquiries_phone_trgm_idx
  on inquiries using gin (phone gin_trgm_ops);

create table if not exists as_receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vehicle_name text not null,
  vehicle_number text not null,
  mileage_km integer not null,
  customer_name text,
  phone text,
  purchase_date date,
  vin_image_url text,
  engine_image_url text,
  symptom text,
  service_detail text
);

create index if not exists as_receipts_vehicle_number_idx
  on as_receipts (vehicle_number);

create table if not exists vehicle_profiles (
  vehicle_number_norm text primary key,
  vehicle_number_raw text not null,
  vehicle_name text not null,
  mileage_km integer,
  customer_name text,
  phone text,
  purchase_date date,
  updated_at timestamptz not null default now()
);


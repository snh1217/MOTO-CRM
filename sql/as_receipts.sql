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

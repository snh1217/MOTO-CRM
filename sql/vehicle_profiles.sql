create index if not exists receipts_vehicle_number_idx on receipts (vehicle_number);

create table if not exists vehicle_profiles (
  vehicle_number_norm text primary key,
  vehicle_number_raw text not null,
  vehicle_name text not null,
  mileage_km integer,
  customer_name text not null,
  phone text not null,
  purchase_date date not null,
  updated_at timestamptz not null default now()
);

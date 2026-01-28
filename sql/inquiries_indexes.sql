create index if not exists inquiries_created_at_idx on inquiries (created_at desc);
create index if not exists inquiries_contacted_created_at_idx on inquiries (contacted, created_at desc);
create index if not exists inquiries_phone_idx on inquiries (phone);
create index if not exists inquiries_customer_name_idx on inquiries (customer_name);

create extension if not exists pg_trgm;
create index if not exists inquiries_customer_name_trgm_idx
  on inquiries using gin (customer_name gin_trgm_ops);
create index if not exists inquiries_phone_trgm_idx
  on inquiries using gin (phone gin_trgm_ops);

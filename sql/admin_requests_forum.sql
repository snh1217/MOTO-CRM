create table if not exists admin_requests (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  center_name text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references admin_users(id) on delete set null,
  center_id uuid references centers(id) on delete restrict
);

create index if not exists admin_requests_status_requested_at_idx
  on admin_requests (status, requested_at desc);

alter table admin_users add column if not exists is_superadmin boolean not null default false;

create table if not exists forum_posts (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete restrict,
  author_user_id uuid not null references admin_users(id) on delete restrict,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_posts_center_id_created_at_idx
  on forum_posts (center_id, created_at desc);

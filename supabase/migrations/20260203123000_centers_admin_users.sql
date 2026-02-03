create extension if not exists pgcrypto;

create table if not exists centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

insert into centers (name, code)
values ('Default Center', 'default')
on conflict (code) do nothing;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  username text unique,
  password_hash text not null,
  center_id uuid not null references centers(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admin_users_identifier_chk check (email is not null or username is not null)
);

alter table receipts add column if not exists center_id uuid;
alter table inquiries add column if not exists center_id uuid;
alter table as_receipts add column if not exists center_id uuid;
alter table todos add column if not exists center_id uuid;

update receipts
set center_id = (select id from centers where code = 'default' limit 1)
where center_id is null;

update inquiries
set center_id = (select id from centers where code = 'default' limit 1)
where center_id is null;

update as_receipts
set center_id = (select id from centers where code = 'default' limit 1)
where center_id is null;

update todos
set center_id = (select id from centers where code = 'default' limit 1)
where center_id is null;

alter table receipts alter column center_id set not null;
alter table inquiries alter column center_id set not null;
alter table as_receipts alter column center_id set not null;
alter table todos alter column center_id set not null;

do $$
begin
  alter table receipts
    add constraint receipts_center_id_fkey
    foreign key (center_id) references centers(id) on delete restrict;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table inquiries
    add constraint inquiries_center_id_fkey
    foreign key (center_id) references centers(id) on delete restrict;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table as_receipts
    add constraint as_receipts_center_id_fkey
    foreign key (center_id) references centers(id) on delete restrict;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table todos
    add constraint todos_center_id_fkey
    foreign key (center_id) references centers(id) on delete restrict;
exception
  when duplicate_object then null;
end $$;

alter table todos drop constraint if exists todos_pkey;
alter table todos add primary key (center_id, date);

create index if not exists receipts_center_id_created_at_idx on receipts (center_id, created_at desc);
create index if not exists inquiries_center_id_created_at_idx on inquiries (center_id, created_at desc);
create index if not exists as_receipts_center_id_created_at_idx on as_receipts (center_id, created_at desc);
create index if not exists todos_center_id_date_idx on todos (center_id, date);

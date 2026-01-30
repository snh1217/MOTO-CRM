create table if not exists todos (
  date date primary key,
  items text[] not null default '{}',
  updated_at timestamptz not null default now()
);

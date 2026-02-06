-- forum enhancements
alter table forum_posts add column if not exists updated_at timestamptz;

create table if not exists forum_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  center_id uuid not null references centers(id) on delete restrict,
  path text not null,
  url text not null,
  mime_type text,
  created_at timestamptz not null default now()
);

create index if not exists forum_post_media_post_id_idx on forum_post_media (post_id);

create table if not exists forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references forum_posts(id) on delete cascade,
  center_id uuid not null references centers(id) on delete restrict,
  author_user_id uuid not null references admin_users(id) on delete restrict,
  author_name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists forum_comments_post_id_idx on forum_comments (post_id);

create table if not exists forum_notifications (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references centers(id) on delete restrict,
  type text not null,
  post_id uuid references forum_posts(id) on delete set null,
  comment_id uuid references forum_comments(id) on delete set null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists forum_notifications_center_id_read_idx on forum_notifications (center_id, is_read, created_at desc);

-- todos center name
alter table todos add column if not exists center_name text;
update todos
set center_name = centers.name
from centers
where todos.center_id = centers.id and todos.center_name is null;

-- fix center name
update centers
set name = '신갈롤링트라이브'
where code = 'MOTO';

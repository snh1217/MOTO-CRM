alter table inquiries add column if not exists note text;
alter table inquiries add column if not exists note_updated_at timestamptz;

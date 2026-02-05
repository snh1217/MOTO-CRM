alter table admin_users add column if not exists is_superadmin boolean not null default false;

update admin_users
set is_superadmin = true
where username = 'moto';

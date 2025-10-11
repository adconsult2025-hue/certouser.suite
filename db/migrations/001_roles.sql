-- db/migrations/001_roles.sql
create table if not exists users (
  id bigserial primary key,
  email text unique not null,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists roles (
  id bigserial primary key,
  email text not null references users(email) on delete cascade,
  role text not null check (role in ('SUPERADMIN','ADMIN_CER','COLLABORATORE','VIEWER')),
  cer_id text,
  territori text,
  assigned_at timestamptz default now()
);

create index if not exists roles_email_idx on roles(email);
create index if not exists roles_cer_idx on roles(cer_id);
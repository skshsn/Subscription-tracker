create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table categories is 'System default categories (user_id is null) plus per-user custom categories.';

-- Postgres unique constraints treat NULLs as distinct, so a plain unique(user_id, name)
-- would not stop duplicate default-category names (user_id is null for all of them).
-- Two partial unique indexes cover both cases correctly.
create unique index categories_default_name_key on categories (name) where user_id is null;
create unique index categories_user_name_key on categories (user_id, name) where user_id is not null;

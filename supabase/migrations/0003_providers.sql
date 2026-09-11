create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domains text[] not null default '{}',
  logo_url text,
  default_category_id uuid references categories(id),

  manage_url text,
  cancel_url text,
  support_url text,
  cancellation_method cancellation_type not null default 'unknown',
  instructions text,
  platform_variations jsonb not null default '{}'::jsonb,

  country text not null default 'global',
  last_verified date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index providers_domains_gin on providers using gin (domains);

comment on table providers is 'Admin-maintained cancellation-link directory. Writable only via service_role.';
comment on column providers.platform_variations is 'Per-platform URL/instruction overrides, e.g. {"apple": {"cancel_url": "https://apps.apple.com/account/subscriptions"}}.';

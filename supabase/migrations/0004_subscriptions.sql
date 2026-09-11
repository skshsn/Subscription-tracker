create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references providers(id),

  -- Identity
  merchant_name text not null,
  product_name text,
  logo_url text,
  website_url text,
  category_id uuid references categories(id),

  -- Billing
  price numeric(12, 2) not null default 0,
  currency char(3) not null,
  billing_frequency billing_frequency not null,
  billing_cycle_days int,
  next_billing_date date,
  previous_billing_date date,
  taxes numeric(12, 2),

  -- Status
  status subscription_status not null default 'unknown',
  trial_end_date date,
  access_until_date date,

  -- Purchase info
  subscription_start_date date,
  first_payment_date date,
  payment_method text,
  purchase_platform purchase_platform not null default 'other',

  -- Management
  manage_url text,
  cancel_url text,
  cancellation_instructions text,
  cancellation_type cancellation_type not null default 'unknown',

  -- Detection metadata
  detection_source detection_source not null default 'manual',
  detection_confidence numeric(5, 2),
  last_verified_at timestamptz,
  email_message_ref text,
  transaction_ref text,

  -- User-correction protection: fields the user has manually edited are
  -- never silently overwritten by later automated (email) detection.
  user_verified_fields text[] not null default '{}',
  is_user_verified boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint price_non_negative check (price >= 0),
  constraint detection_confidence_range check (
    detection_confidence is null or (detection_confidence >= 0 and detection_confidence <= 100)
  )
);

create index subscriptions_user_id_idx on subscriptions (user_id);
create index subscriptions_next_billing_idx on subscriptions (user_id, next_billing_date);
create index subscriptions_status_idx on subscriptions (user_id, status);

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_set_updated_at
  before update on subscriptions
  for each row
  execute function set_updated_at();

create trigger providers_set_updated_at
  before update on providers
  for each row
  execute function set_updated_at();

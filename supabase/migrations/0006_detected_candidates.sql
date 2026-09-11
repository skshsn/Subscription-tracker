create table detected_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_connection_id uuid references gmail_connections(id) on delete set null,

  message_id text not null,
  thread_id text,
  sender_domain text,
  subject text,
  snippet text,

  merchant_guess text,
  provider_id uuid references providers(id),
  price_guess numeric(12, 2),
  currency_guess char(3),
  frequency_guess billing_frequency,
  next_billing_date_guess date,
  trial_guess boolean not null default false,

  confidence numeric(5, 2) not null,
  matched_keywords text[] not null default '{}',
  raw_extract jsonb not null default '{}'::jsonb,

  matched_existing_subscription_id uuid references subscriptions(id) on delete set null,

  status candidate_status not null default 'pending',
  created_subscription_id uuid references subscriptions(id) on delete set null,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint confidence_range check (confidence >= 0 and confidence <= 100),
  unique (user_id, message_id)
);

create index detected_candidates_user_status_idx on detected_candidates (user_id, status);

comment on table detected_candidates is 'Pre-confirmation staging rows from the Gmail scan. raw_extract holds structured fields + a short snippet only, never the full email body.';

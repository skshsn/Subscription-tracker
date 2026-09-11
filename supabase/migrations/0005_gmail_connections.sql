create table gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  gmail_address text not null,

  -- Application-layer AES-256-GCM ciphertext (encrypted before insert, on
  -- top of Supabase's disk-level encryption at rest). Never exposed to the
  -- `authenticated`/`anon` roles -- see RLS policy in 0008.
  access_token_enc text not null,
  refresh_token_enc text not null,
  token_expiry timestamptz not null,

  scope text not null default 'https://www.googleapis.com/auth/gmail.readonly',
  history_id text,
  last_scanned_at timestamptz,
  status gmail_connection_status not null default 'connected',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gmail_connections_set_updated_at
  before update on gmail_connections
  for each row
  execute function set_updated_at();

comment on table gmail_connections is 'Encrypted Gmail OAuth token storage. Service-role access only -- never granted to authenticated/anon.';

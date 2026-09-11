create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  reminder_days_monthly int not null default 2,
  reminder_days_annual int not null default 7,
  reminder_days_trial int not null default 3,
  digest_time time not null default '08:00',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on notification_preferences
  for each row
  execute function set_updated_at();

create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  reminder_type reminder_type not null,
  cycle_key date not null,
  sent_at timestamptz,
  status text not null default 'pending',
  email_provider_message_id text,
  error text,
  created_at timestamptz not null default now(),

  constraint reminder_status_valid check (status in ('pending', 'sent', 'failed')),
  unique (subscription_id, reminder_type, cycle_key)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_subscription_id uuid references subscriptions(id) on delete set null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications (user_id) where read_at is null;

-- Enable RLS everywhere first.
alter table categories enable row level security;
alter table providers enable row level security;
alter table subscriptions enable row level security;
alter table gmail_connections enable row level security;
alter table detected_candidates enable row level security;
alter table notification_preferences enable row level security;
alter table reminder_log enable row level security;
alter table notifications enable row level security;

-- categories: everyone can read system defaults + their own rows;
-- users may only insert/update/delete their own (non-default) rows.
create policy "categories_select" on categories
  for select
  using (user_id = auth.uid() or user_id is null);

create policy "categories_insert" on categories
  for insert
  with check (user_id = auth.uid());

create policy "categories_update" on categories
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "categories_delete" on categories
  for delete
  using (user_id = auth.uid());

-- providers: public read for any authenticated user; writes are
-- service_role only (service_role bypasses RLS entirely, so no policy
-- is needed to grant it write access -- the absence of insert/update/
-- delete policies here is what blocks authenticated/anon from writing).
create policy "providers_select" on providers
  for select
  to authenticated
  using (true);

-- subscriptions, detected_candidates, notification_preferences,
-- reminder_log, notifications: strict owner-only access.
create policy "subscriptions_all" on subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "detected_candidates_all" on detected_candidates
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notification_preferences_all" on notification_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reminder_log_select" on reminder_log
  for select
  using (user_id = auth.uid());

create policy "notifications_all" on notifications
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- gmail_connections: default-deny. No policy is created for
-- authenticated/anon roles at all, so RLS blocks every client-side
-- access; only service_role (used exclusively server-side) can touch
-- this table. RLS is still enabled above so this is explicit, not
-- accidental.

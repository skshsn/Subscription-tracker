-- Cancellation-link directory seed data. URLs verified via live search
-- during planning (2026-09-11) rather than from model memory alone;
-- confidence notes are in the plan doc, not repeated per-row here.
-- Providers without one stable, independently-verified cancel URL
-- (Notion, Slack -- workspace/admin-scoped billing) are deliberately
-- left out rather than guessing a plausible-looking link.

insert into providers (
  name, slug, domains, default_category_id,
  manage_url, cancel_url, support_url,
  cancellation_method, instructions, platform_variations,
  country, last_verified
) values

(
  'Netflix', 'netflix', '{netflix.com}',
  (select id from categories where name = 'Streaming & Entertainment' and user_id is null),
  'https://www.netflix.com/youraccount', 'https://www.netflix.com/cancelplan',
  'https://help.netflix.com', 'direct_web', null, '{}'::jsonb,
  'global', '2026-09-11'
),
(
  'Spotify', 'spotify', '{spotify.com}',
  (select id from categories where name = 'Music' and user_id is null),
  'https://www.spotify.com/account/', null,
  'https://support.spotify.com/us/article/cancel-premium/', 'direct_web',
  'Open Spotify Account > Your Plan > Change Plan > scroll to Spotify Free > Cancel Premium.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'YouTube Premium', 'youtube-premium', '{youtube.com,google.com}',
  (select id from categories where name = 'Streaming & Entertainment' and user_id is null),
  'https://www.youtube.com/paid_memberships', 'https://www.youtube.com/paid_memberships',
  'https://support.google.com/youtube', 'direct_web',
  'On the Memberships page, select Deactivate next to YouTube Premium, then Continue.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Amazon Prime', 'amazon-prime', '{amazon.com}',
  (select id from categories where name = 'Shopping & Membership' and user_id is null),
  'https://www.amazon.com/gp/primecentral', 'https://www.amazon.com/gp/primecentral',
  'https://www.amazon.com/gp/help', 'direct_web',
  'Go to Prime Central > "Update, Cancel and More" > Cancel Membership.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'ChatGPT Plus', 'chatgpt-plus', '{openai.com,chatgpt.com}',
  (select id from categories where name = 'AI Tools' and user_id is null),
  'https://chatgpt.com/', null,
  'https://help.openai.com/en/articles/7232927-how-do-i-cancel-my-chatgpt-plus-subscription',
  'direct_web',
  'In ChatGPT, open Settings > Billing > Cancel plan.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Claude Pro', 'claude-pro', '{anthropic.com,claude.ai}',
  (select id from categories where name = 'AI Tools' and user_id is null),
  'https://claude.ai/settings/billing', null,
  'https://support.claude.com/en/articles/8325617-cancel-your-pro-or-max-subscription',
  'direct_web',
  'In claude.ai, open Settings > Billing > Cancel your plan.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Google One', 'google-one', '{google.com}',
  (select id from categories where name = 'Cloud Storage' and user_id is null),
  'https://one.google.com/settings', null,
  'https://support.google.com/googleone', 'direct_web',
  'Go to one.google.com/settings and select Cancel membership.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Adobe Creative Cloud', 'adobe-creative-cloud', '{adobe.com}',
  (select id from categories where name = 'Productivity & Software' and user_id is null),
  'https://account.adobe.com/plans', 'https://account.adobe.com/plans',
  'https://helpx.adobe.com/manage-account/using/cancel-subscription.html',
  'direct_web',
  'On the Plans page, select Manage plan > Cancel your plan. Annual-commitment plans may have an early-termination fee outside the 14-day refund window.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Canva', 'canva', '{canva.com}',
  (select id from categories where name = 'Productivity & Software' and user_id is null),
  'https://www.canva.com/settings/billing', null,
  'https://www.canva.com/help/cancel-canva-plan/', 'direct_web',
  'In Canva, open Settings > Billing & Plans > Cancel plan.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Microsoft 365', 'microsoft-365', '{microsoft.com}',
  (select id from categories where name = 'Productivity & Software' and user_id is null),
  'https://account.microsoft.com/services', 'https://account.microsoft.com/services',
  'https://support.microsoft.com', 'direct_web',
  'On the Services & subscriptions page, select Manage > Cancel.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Dropbox', 'dropbox', '{dropbox.com}',
  (select id from categories where name = 'Cloud Storage' and user_id is null),
  'https://www.dropbox.com/account/billing', null,
  'https://help.dropbox.com', 'direct_web',
  'Click your avatar > Manage account > Cancel plan.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'LinkedIn Premium', 'linkedin-premium', '{linkedin.com}',
  (select id from categories where name = 'Productivity & Software' and user_id is null),
  null, null,
  'https://www.linkedin.com/help/linkedin/answer/a545578', 'direct_web',
  'Profile icon > Premium features > Manage subscription > Purchases > Cancel subscription.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Audible', 'audible', '{audible.com}',
  (select id from categories where name = 'News & Reading' and user_id is null),
  'https://www.audible.com/account/membership', 'https://www.audible.com/account/membership/cancel/show-offers',
  'https://www.audible.com/help', 'direct_web',
  'The cancel page may first show retention offers before confirming cancellation.',
  '{}'::jsonb, 'global', '2026-09-11'
),
(
  'Disney+', 'disney-plus', '{disneyplus.com,disney.com}',
  (select id from categories where name = 'Streaming & Entertainment' and user_id is null),
  'https://www.disneyplus.com/account', 'https://www.disneyplus.com/account',
  'https://help.disneyplus.com', 'direct_web',
  'On the Account page, select Subscription > Cancel Subscription.',
  '{}'::jsonb, 'global', '2026-09-11'
);

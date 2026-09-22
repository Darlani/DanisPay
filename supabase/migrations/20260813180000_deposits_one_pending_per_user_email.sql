-- Enforce the existing business rule: one Pending deposit per user email.
-- This migration is local only until explicitly reviewed and deployed.

create unique index deposits_one_pending_per_user_email_idx
  on public.deposits (user_email)
  where status = 'Pending';

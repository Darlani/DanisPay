alter table public.deposits
  add column unique_code integer null,
  add column total_amount bigint null;

create unique index deposits_one_pending_total_amount_idx
  on public.deposits (total_amount)
  where status = 'Pending'
    and total_amount is not null;

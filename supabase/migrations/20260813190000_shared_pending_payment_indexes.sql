create unique index orders_one_pending_total_amount_idx
  on public.orders (total_amount)
  where status = 'Pending'
    and total_amount is not null
    and total_amount > 0;

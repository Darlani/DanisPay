alter table public.orders
  add column idempotency_key uuid null;

create unique index orders_member_idempotency_key_idx
  on public.orders (user_id, idempotency_key)
  where user_id is not null
    and idempotency_key is not null;

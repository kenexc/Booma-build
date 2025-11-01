-- Purpose: Supabase SQL schema for Booma minimal backend
-- Assumptions: Run in dev using service role. In prod, schema is applied via migrations.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  provider text not null,
  plaid_account_id text,
  name_on_account text,
  routing_number_last4 text,
  account_number_last4 text,
  status text default 'verified',
  created_at timestamptz default now()
);

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  processor text,
  processor_merchant_id text
);

do $$ begin
  create type refund_status as enum ('initiated','approved','instant_sent','posted','recouped','failed');
exception when duplicate_object then null;
end $$;

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  merchant_id uuid references merchants(id),
  processor text not null,
  processor_refund_id text,
  original_charge_id text,
  amount_cents int not null,
  card_last4 text,
  status refund_status not null default 'initiated',
  posted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid references refunds(id),
  type text not null,
  amount_cents int not null,
  currency text default 'usd',
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'default',
  key text unique not null,
  status text not null default 'in_progress',
  response_body jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idempotency_keys_scope_key_idx on idempotency_keys(scope, key);

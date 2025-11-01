# Booma Backend - Testing Guide

This guide explains how to run the schema locally, start the dev server, test Stripe and Plaid webhooks, use the Dwolla sandbox, and exercise core API routes with Postman.

## 1) Apply the database schema locally

Use either psql or the Supabase SQL editor to run the schema file at `supabase/schema.sql`.

- Using psql:
  - Ensure you can connect to your local or remote Postgres/Supabase database
  - Run: `psql "$DATABASE_URL" -f supabase/schema.sql`
- Using Supabase SQL editor:
  - Open your project at the Supabase dashboard
  - Go to SQL → paste the contents of `supabase/schema.sql`
  - Run the SQL

## 2) Start the dev server

- Install dependencies: `npm install`
- Start dev: `npm run dev`
- The app will be available at `http://localhost:3000`

Ensure you have a `.env.local` with keys similar to `.env.example`.

## 3) Stripe CLI (webhook testing)

- Install the Stripe CLI: see Stripe docs
- Login: `stripe login`
- Forward events to the local webhook route:
  - `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Trigger refund-related events for testing:
  - `stripe trigger charge.refunded`
  - You can also test `refund.succeeded` by creating a refund and forwarding events.

Webhook route in this project:
- `POST /api/webhooks/stripe` (signature verified with `STRIPE_WEBHOOK_SECRET`)

## 4) Plaid webhook (notes)

- Configure the webhook URL in the Plaid dashboard to point to your deployed endpoint or your local tunnel (e.g., using ngrok):
  - Example: `https://your-domain.com/api/webhooks/plaid`
- To simulate a credit transaction in sandbox:
  - Use Plaid sandbox item and the Transactions product
  - Follow Plaid docs to add a sandbox transaction event that will post to your webhook
  - Confirm events are received by your webhook logging

Note: The Plaid webhook route should be exposed at `POST /api/webhooks/plaid` (add if not present in your environment).

## 5) Dwolla sandbox (advance and collect flows)

- Fetch your sandbox API key and secret from the Dwolla sandbox dashboard
- Set `DWOLLA_ENV=sandbox` and your keys in `.env.local`
- The following routes will run against the sandbox and simulate ACH:
  - `POST /api/advance` — initiates an ACH credit to the user
  - `POST /api/collect` — initiates an ACH debit from the user

Note: In this minimal implementation, customers and funding sources may use placeholders in development; replace with real values when integrating funding source linking.

## 6) Postman examples

- Create a collection and add the following requests.

1. Advance a refund
- Method: POST
- URL: `http://localhost:3000/api/advance`
- Body (JSON):
```
{
  "refund_id": "<refund-uuid>"
}
```
- Expected response:
```
{
  "ok": true,
  "data": { "ok": true }
}
```

2. Collect a refund
- Method: POST
- URL: `http://localhost:3000/api/collect`
- Body (JSON):
```
{
  "refund_id": "<refund-uuid>"
}
```
- Expected response:
```
{
  "ok": true,
  "data": { "ok": true }
}
```

3. Get refund details
- Method: GET
- URL: `http://localhost:3000/api/refunds/<refund-uuid>`
- Expected response includes `fee_cents` and `net_payout_cents`:
```
{
  "ok": true,
  "data": {
    "id": "<refund-uuid>",
    "user_id": "<user-uuid>",
    "amount_cents": 12345,
    "status": "approved",
    "fee_cents": 1000,
    "net_payout_cents": 11345
  }
}
```

### Demo-only helpers (manual testing)

These routes flip statuses without external calls. Do not enable in production.
- `POST /api/demo/approve` — body `{ "refund_id": "..." }` → sets `approved` from `initiated`
- `POST /api/demo/post` — body `{ "refund_id": "..." }` → sets `posted` from `instant_sent`
- `POST /api/demo/recoup` — body `{ "refund_id": "..." }` → sets `recouped` from `posted`

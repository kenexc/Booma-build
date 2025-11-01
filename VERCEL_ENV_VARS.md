# Vercel Environment Variables

Add these environment variables in your Vercel project settings:

## Required Variables

### Supabase
- `SUPABASE_URL`
  - Value: `https://your-project.supabase.co` (Get from Supabase Dashboard)
  
- `SUPABASE_SERVICE_ROLE_KEY`
  - Value: `eyJhbG...` (Get from Supabase Dashboard → Settings → API)

### Stripe
- `STRIPE_SECRET_KEY`
  - Value: `sk_test_...` (Get from Stripe Dashboard)
  
- `STRIPE_WEBHOOK_SECRET`
  - Value: `whsec_...` (Get from Stripe Webhook endpoint settings)

### Plaid (Sandbox)
- `PLAID_CLIENT_ID`
  - Value: `...` (Get from Plaid Dashboard)
  
- `PLAID_SECRET`
  - Value: `...` (Get from Plaid Dashboard → Team Settings → Keys)
  
- `PLAID_ENV`
  - Value: `sandbox`

### Dwolla (Sandbox)
- `DWOLLA_API_KEY`
  - Value: `...` (Get from Dwolla Dashboard)
  
- `DWOLLA_API_SECRET`
  - Value: `...` (Get from Dwolla Dashboard)
  
- `DWOLLA_ENV`
  - Value: `sandbox`

### App URL
- `NEXT_PUBLIC_APP_URL`
  - Value: `https://your-vercel-domain.vercel.app`
  - Used for Plaid webhook URL generation

## Optional Variables

- `DWOLLA_PROGRAM_FUNDING_SOURCE`
  - Optional: Falls back to demo placeholder if not set
  - Set this when you have a real Dwolla program funding source

- `NEXT_PUBLIC_BASE_URL`
  - Optional: Auto-detected from VERCEL_URL in production
  - Only set if you need a custom base URL

## Auto-Set by Vercel (Don't Add These)

- `NODE_ENV` - Automatically set to `production` on Vercel
- `VERCEL_URL` - Automatically set by Vercel for each deployment

---

## How to Add in Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable above with its corresponding value
4. Select **Production**, **Preview**, and **Development** environments as needed
5. Click **Save**
6. Redeploy your application for changes to take effect


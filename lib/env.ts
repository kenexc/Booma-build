/*********
Purpose: Runtime env loader and validator.
Assumptions: In production, all required environment variables must be set. In non-production, missing values are allowed but typed as empty strings to avoid crashes.
*********/

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  PLAID_CLIENT_ID: string;
  PLAID_sandbox: string;
  DWOLLA_API_KEY: string;
  DWOLLA_API_SECRET: string;
  DWOLLA_ENV: 'sandbox' | 'production' | string;
  NODE_ENV?: 'development' | 'test' | 'production' | string;
};

function getEnvVar(name: keyof Env, defaultValue = ''): string {
  const value = process.env[name as string] ?? defaultValue;
  return value;
}

const env: Env = {
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET'),
  PLAID_CLIENT_ID: getEnvVar('PLAID_CLIENT_ID'),
  PLAID_sandbox: getEnvVar('PLAID_sandbox'),
  DWOLLA_API_KEY: getEnvVar('DWOLLA_API_KEY'),
  DWOLLA_API_SECRET: getEnvVar('DWOLLA_API_SECRET'),
  DWOLLA_ENV: (getEnvVar('DWOLLA_ENV') as Env['DWOLLA_ENV']) || 'sandbox',
  NODE_ENV: process.env.NODE_ENV,
};

const REQUIRED_IN_PROD: Array<keyof Env> = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PLAID_CLIENT_ID',
  'PLAID_sandbox',
  'DWOLLA_ENV',
];

if (env.NODE_ENV === 'production') {
  const missing = REQUIRED_IN_PROD.filter((key) => !env[key] || String(env[key]).trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

export { env };

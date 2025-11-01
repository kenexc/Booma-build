/*********
Purpose: Simple idempotency helper keyed by `key` for external calls and webhooks.
Assumptions: Uses Supabase `idempotency_keys` table with columns: key (unique), status, response_body.
*********/

import { getSupabaseAdmin } from './db';

export async function withIdempotency<T>(
	key: string,
	fn: () => Promise<T>
): Promise<{ alreadyRan: boolean; result: T }> {
	const admin = getSupabaseAdmin();
	const { data: existing } = await admin
		.from('idempotency_keys')
		.select('key, response_body')
		.eq('key', key)
		.maybeSingle();

	const isProd = process.env.NODE_ENV === 'production';

	if (existing) {
		if (isProd) {
			return { alreadyRan: true, result: (existing as any).response_body as T };
		}
		const rerun = await fn();
		return { alreadyRan: true, result: rerun };
	}

	await admin
		.from('idempotency_keys')
		.insert({ key, status: 'in_progress' })
		.select('key')
		.single();

	const result = await fn();

	await admin
		.from('idempotency_keys')
		.update({ status: 'completed', response_body: result as any })
		.eq('key', key);

	return { alreadyRan: false, result };
}

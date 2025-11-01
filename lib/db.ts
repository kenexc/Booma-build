/*********
Purpose: Supabase server admin client and minimal typed helpers for DB access.
Assumptions: Uses service role key on server only. The `idempotency_keys` table exists with unique constraints as needed.
*********/

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use a permissive Database typing for now to avoid over-constraining query builders
export type Database = any;

let cachedAdmin: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
	if (cachedAdmin) return cachedAdmin;
	const url = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceRoleKey) {
		throw new Error('Supabase env vars are not set');
	}
	cachedAdmin = createClient<Database>(url, serviceRoleKey, {
		auth: { persistSession: false, autoRefreshToken: false },
	});
	return cachedAdmin;
}

// Generic helpers
export async function insert<TPayload extends Record<string, unknown>, TRow = unknown>(
	table: string,
	payload: TPayload
): Promise<TRow> {
	const sb = getSupabaseAdmin() as any;
	const { data, error } = await (sb as any).from(table).insert(payload as any).select('*').single();
	if (error) throw error;
	return data as TRow;
}

export async function update<TPayload extends Record<string, unknown>, TRow = unknown>(
	table: string,
	filters: Record<string, unknown>,
	changes: TPayload
): Promise<TRow[]> {
	const sb = getSupabaseAdmin() as any;
	let query = (sb as any).from(table).update(changes as any).select('*');
	for (const [key, value] of Object.entries(filters)) {
		query = query.eq(key, value as never);
	}
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as TRow[];
}

export async function selectOne<TRow = unknown>(
	table: string,
	filters: Record<string, unknown>
): Promise<TRow | null> {
	const sb = getSupabaseAdmin() as any;
	let query = (sb as any).from(table).select('*');
	for (const [key, value] of Object.entries(filters)) {
		query = query.eq(key, value as never);
	}
	const { data, error } = await query.maybeSingle();
	if (error) throw error;
	return (data as TRow) ?? null;
}

export async function selectMany<TRow = unknown>(
	table: string,
	filters: Record<string, unknown> = {}
): Promise<TRow[]> {
	const sb = getSupabaseAdmin() as any;
	let query = (sb as any).from(table).select('*');
	for (const [key, value] of Object.entries(filters)) {
		query = query.eq(key, value as never);
	}
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as TRow[];
}

// Idempotency helpers kept here for convenience
export interface IdempotencyUpsertInput {
	scope: string;
	key: string;
	status: 'in_progress' | 'completed' | 'failed';
	response_body?: unknown | null;
	error_message?: string | null;
}

export async function upsertIdempotencyRecord(input: IdempotencyUpsertInput) {
	const supabase = getSupabaseAdmin() as any;
	const { data, error } = await (supabase as any)
		.from('idempotency_keys')
		.upsert(
			{
				scope: input.scope,
				key: input.key,
				status: input.status,
				response_body: input.response_body ?? null,
				error_message: input.error_message ?? null,
			},
			{ onConflict: 'scope,key' }
		)
		.select()
		.single();
	if (error) throw error;
	return data?.[0] ?? null;
}

export async function getIdempotencyRecord(scope: string, key: string) {
	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from('idempotency_keys')
		.select('*')
		.eq('scope', scope)
		.eq('key', key)
		.maybeSingle();
	if (error) throw error;
	return data;
}

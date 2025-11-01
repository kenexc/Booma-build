/*********
Purpose: Dev-only migration runner that reads supabase/schema.sql and applies it once.
Assumptions: In production, schema is applied externally. To enable local execution, set ENABLE_DEV_SQL_MIGRATIONS=1 and SUPABASE_ACCESS_TOKEN with project-level access. This uses Supabase SQL API derived from SUPABASE_URL ref.
*********/

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

function getProjectRefFromUrl(url: string): string | null {
	try {
		const u = new URL(url);
		// subdomain is like https://<ref>.supabase.co
		const [ref] = (u.hostname || '').split('.');
		return ref || null;
	} catch {
		return null;
	}
}

export async function runDevMigrationsOnce(): Promise<void> {
	if (process.env.NODE_ENV === 'production') return;
	const enabled = process.env.ENABLE_DEV_SQL_MIGRATIONS === '1';
	if (!enabled) return;

	const supabaseUrl = process.env.SUPABASE_URL;
	const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
	if (!supabaseUrl || !accessToken) {
		console.warn('Dev migrations skipped. Missing SUPABASE_URL or SUPABASE_ACCESS_TOKEN.');
		return;
	}
	const ref = getProjectRefFromUrl(supabaseUrl);
	if (!ref) {
		console.warn('Dev migrations skipped. Could not determine project ref from SUPABASE_URL.');
		return;
	}

	const sql = readFileSync('supabase/schema.sql', 'utf8');
	const hash = createHash('sha256').update(sql).digest('hex');
	const storageKey = `__booma_schema_${hash}`;
	if ((globalThis as any)[storageKey]) return;

	const resp = await fetch(`https://api.supabase.com/v1/projects/${ref}/sql`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			query: sql,
			// Default to postgres schema
			db: 'default',
		}),
	});
	if (!resp.ok) {
		const text = await resp.text();
		throw new Error(`Dev migrations failed: ${resp.status} ${text}`);
	}
	(globalThis as any)[storageKey] = true;
}

/*********
Purpose: Trigger a Plaid sandbox webhook to simulate a transaction event.
Assumptions: Takes access_token and calls Plaid's fire_webhook endpoint.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { plaidPost } from '@/lib/plaid';

export async function POST(req: Request) {
	try {
		const { access_token } = await req.json();
		if (!access_token) {
			return NextResponse.json({ ok: false, error: 'access_token required' }, { status: 400 });
		}

		const resp = await plaidPost('/sandbox/item/fire_webhook', {
			access_token,
			webhook_code: 'DEFAULT_UPDATE',
		});

		return NextResponse.json({ ok: true, webhook_fired: resp.webhook_fired });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


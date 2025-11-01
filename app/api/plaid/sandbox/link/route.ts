/*********
Purpose: Create a Plaid sandbox item and exchange for access_token.
Assumptions: Uses sandbox environment. Creates an item with webhook URL pointing to deployed endpoint.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { plaidPost } from '@/lib/plaid';

export async function POST() {
	try {
		const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
			? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`
			: 'https://placeholder.vercel.app/api/webhooks/plaid';

		const resp = await plaidPost('/sandbox/public_token/create', {
			institution_id: 'ins_109508',
			initial_products: ['transactions'],
			webhook: webhookUrl,
		});

		const { public_token } = resp;
		const exchangeResp = await plaidPost('/item/public_token/exchange', {
			public_token,
		});

		return NextResponse.json({
			ok: true,
			access_token: exchangeResp.access_token,
			item_id: exchangeResp.item_id,
		});
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


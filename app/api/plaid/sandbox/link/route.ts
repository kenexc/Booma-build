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
		const resp = await plaidPost('/sandbox/public_token/create', {
			institution_id: 'ins_109508',
			initial_products: ['transactions'],
		});

		const { public_token } = resp;
		const exchangeResp = await plaidPost('/item/public_token/exchange', {
			public_token,
		});

		const access_token = exchangeResp.access_token;
		const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
			? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`
			: 'https://placeholder.vercel.app/api/webhooks/plaid';

		// Set webhook after item is created
		try {
			await plaidPost('/item/webhook/update', {
				access_token,
				webhook: webhookUrl,
			});
		} catch (webhookError) {
			// Webhook update might fail in sandbox, but we can still use fire_webhook
			console.warn('Webhook update failed, but item created:', webhookError);
		}

		return NextResponse.json({
			ok: true,
			access_token,
			item_id: exchangeResp.item_id,
		});
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


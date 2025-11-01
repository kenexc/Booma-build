/*********
Purpose: Plaid webhook handler for TRANSACTIONS.DEFAULT_UPDATE events.
Assumptions: When a credit transaction matches a refund amount, update refund status from instant_sent to posted.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { selectMany, update } from '@/lib/db';
import type { RefundRecord } from '@/lib/types';

export async function POST(req: Request) {
	try {
		const body = await req.json();
		if (body.webhook_type !== 'TRANSACTIONS') {
			return NextResponse.json({ ok: true, handled: false });
		}

		if (body.webhook_code === 'DEFAULT_UPDATE') {
			const newTransactions = body.new_transactions || [];
			for (const txn of newTransactions) {
				if (txn.transaction_code === 'credit' || txn.amount < 0) {
					const amount_cents = Math.abs(Math.round(txn.amount * 100));
					// Find refunds in instant_sent status matching this amount
					const refunds = await selectMany<RefundRecord>('refunds', { status: 'instant_sent' });
					const matching = refunds.filter(r => r.amount_cents === amount_cents);
					for (const refund of matching) {
						await update('refunds', { id: refund.id }, {
							status: 'posted',
							posted_at: new Date().toISOString(),
						});
					}
				}
			}
		}

		return NextResponse.json({ ok: true });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


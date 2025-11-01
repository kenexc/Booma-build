/*********
Purpose: Simulate Dwolla advance - mark refund as instant_sent and record fake transfer.
Assumptions: For testing only. Sets status and creates a placeholder ledger entry.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { selectOne, update, insert } from '@/lib/db';
import { calcFeeCents } from '@/lib/types';
import type { RefundRecord, ApiResponse } from '@/lib/types';

export async function POST(req: Request) {
	try {
		const { refund_id } = await req.json();
		if (!refund_id) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'refund_id required' }, { status: 400 });
		}

		const refund = await selectOne<RefundRecord>('refunds', { id: refund_id });
		if (!refund) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund not found' }, { status: 404 });
		}

		if (refund.status !== 'approved') {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund must be approved' }, { status: 400 });
		}

		const fee = calcFeeCents(refund.amount_cents);
		await insert('ledger_entries', {
			refund_id: refund.id,
			type: 'advance',
			amount_cents: refund.amount_cents,
			currency: 'usd',
		});
		await insert('ledger_entries', {
			refund_id: refund.id,
			type: 'fee',
			amount_cents: fee,
			currency: 'usd',
		});

		await update('refunds', { id: refund.id }, {
			status: 'instant_sent',
		});

		return NextResponse.json<ApiResponse<{ transfer_id: string }>>({
			ok: true,
			data: { transfer_id: 'sim_dwolla_advance_' + refund.id },
		});
	} catch (e: any) {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: e.message }, { status: 400 });
	}
}


/*********
Purpose: Fetch a single refund by id and include computed fee and net payout.
Assumptions: Fee is computed with calcFeeCents from lib/types. Net payout is amount minus fee.
*********/

import { NextRequest, NextResponse } from 'next/server';
import { selectOne } from '@/lib/db';
import type { ApiResponse, RefundRecord } from '@/lib/types';
import { calcFeeCents } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
	const id = context.params.id;
	if (!id) {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Missing id' }, { status: 400 });
	}
	const refund = await selectOne<RefundRecord>('refunds', { id });
	if (!refund) {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Not found' }, { status: 404 });
	}
	const fee_cents = calcFeeCents(refund.amount_cents);
	const net_payout_cents = refund.amount_cents - fee_cents;
	return NextResponse.json<ApiResponse<RefundRecord & { fee_cents: number; net_payout_cents: number }>>({
		ok: true,
		data: { ...refund, fee_cents, net_payout_cents },
	});
}

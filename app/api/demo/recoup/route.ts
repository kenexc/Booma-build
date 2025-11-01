"Demo only. Do not enable in production."
/*********
Purpose: Demo-only route to mark a refund as recouped.
Assumptions: Allowed transition is posted -> recouped.
*********/

import { NextRequest, NextResponse } from 'next/server';
import { selectOne, update } from '@/lib/db';
import type { ApiResponse, RefundRecord } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	const body = (await req.json().catch(() => null)) as { refund_id?: string } | null;
	if (!body?.refund_id) {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid input' }, { status: 400 });
	}
	const refund = await selectOne<RefundRecord>('refunds', { id: body.refund_id });
	if (!refund) return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Not found' }, { status: 404 });
	if (refund.status !== 'posted') {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid transition' }, { status: 400 });
	}
	await update('refunds', { id: refund.id }, { status: 'recouped' });
	return NextResponse.json<ApiResponse<{ ok: true }>>({ ok: true, data: { ok: true } });
}

/*********
Purpose: List latest refunds for admin views.
Assumptions: Returns latest 25 with basic fields. Customize selection as needed.
*********/

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/db';
import type { ApiResponse, RefundRecord } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
	const sb = getSupabaseAdmin();
	// For demo: only show refunds from the last 2 hours, max 5 most recent
	const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
	const { data, error } = await sb
		.from('refunds')
		.select('id,user_id,merchant_id,processor,processor_refund_id,original_charge_id,amount_cents,card_last4,status,posted_at,created_at')
		.gte('created_at', twoHoursAgo)
		.order('created_at', { ascending: false })
		.limit(5);
	if (error) {
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: error.message }, { status: 500 });
	}
	return NextResponse.json({ ok: true, data: (data ?? []) as any });
}

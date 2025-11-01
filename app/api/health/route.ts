/*********
Purpose: Health check endpoint for uptime probes.
Assumptions: No auth required.
*********/

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
	return NextResponse.json<ApiResponse<{ ok: true; time: string }>>({
		ok: true,
		data: { ok: true, time: new Date().toISOString() },
	});
}

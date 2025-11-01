/*********
Purpose: Create an advance for a refund by initiating an ACH credit via Dwolla and recording ledger entries.
Assumptions: Uses placeholder program funding source in dev. User matching and funding source linking will be refined later.
*********/

import { NextRequest, NextResponse } from 'next/server';
import { selectOne, update, insert, getSupabaseAdmin } from '@/lib/db';
import type { ApiResponse, RefundRecord, BankAccount } from '@/lib/types';
import { calcFeeCents } from '@/lib/types';
import { withIdempotency } from '@/lib/idempotency';
import { createCustomerIfMissing, createFundingSourceIfMissing, initiateTransfer } from '@/lib/dwolla';
import { logError, logInfo } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => null) as { refund_id?: string } | null;
		if (!body || !body.refund_id) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid input' }, { status: 400 });
		}
		const refundId = body.refund_id;

		const refund = await selectOne<RefundRecord>('refunds', { id: refundId });
		if (!refund) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund not found' }, { status: 404 });
		}
		if (refund.status !== 'approved') {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund not eligible for advance' }, { status: 400 });
		}
		if (refund.amount_cents <= 0) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid refund amount' }, { status: 400 });
		}

		const user = await selectOne<{ id: string; email: string }>('users', { id: refund.user_id });
		if (!user) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'User not found' }, { status: 404 });
		}

		const bank = await selectOne<BankAccount>('bank_accounts', { user_id: refund.user_id, status: 'verified' });
		if (!bank) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Verified bank account required' }, { status: 400 });
		}

		const idempotencyKey = `advance:${refund.id}`;

		const result = await withIdempotency(idempotencyKey, async () => {
			// Create or fetch Dwolla customer and destination funding source
			const dwollaCustomerId = await createCustomerIfMissing({ id: user.id, email: user.email });
			// We do not have full routing/account in DB; in sandbox/dev we allow missing and use placeholder in the client
			const destFundingSource = await createFundingSourceIfMissing(dwollaCustomerId);

			// Program source funding source placeholder. Replace with real FBO or balance funding source.
			const programSourceFundingSource = process.env.DWOLLA_PROGRAM_FUNDING_SOURCE || 'urn:dwolla:funding-source:program-demo';

			const transfer = await initiateTransfer({
				sourceFundingSource: programSourceFundingSource,
				destFundingSource: destFundingSource,
				amountCents: refund.amount_cents,
				idempotencyKey,
			});

			// On success: ledger entries and refund status update
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

			await update('refunds', { id: refund.id }, { status: 'instant_sent' });

			return { transferId: transfer.transferId };
		});

		logInfo('Advance processed', { refundId: refund.id, alreadyRan: result.alreadyRan });
		return NextResponse.json<ApiResponse<{ ok: true }>>({ ok: true, data: { ok: true } });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'unknown error';
		logError('Advance route error', message);
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: message }, { status: 500 });
	}
}

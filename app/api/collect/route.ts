/*********
Purpose: Collect repayment for an advanced refund by initiating an ACH debit via Dwolla and recording a repayment ledger entry.
Assumptions: Uses placeholder program funding source in dev. Bank linking will supply real funding source details later.
*********/

import { NextRequest, NextResponse } from 'next/server';
import { selectOne, update, insert } from '@/lib/db';
import type { ApiResponse, RefundRecord, BankAccount } from '@/lib/types';
import { withIdempotency } from '@/lib/idempotency';
import { createCustomerIfMissing, createFundingSourceIfMissing, initiateTransfer } from '@/lib/dwolla';
import { logError, logInfo } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => null)) as { refund_id?: string } | null;
		if (!body || !body.refund_id) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid input' }, { status: 400 });
		}
		const refundId = body.refund_id;

		const refund = await selectOne<RefundRecord>('refunds', { id: refundId });
		if (!refund) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund not found' }, { status: 404 });
		}
		if (!(refund.status === 'posted' || refund.status === 'instant_sent')) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Refund not eligible for collection' }, { status: 400 });
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

		const idempotencyKey = `collect:${refund.id}`;

		await withIdempotency(idempotencyKey, async () => {
			// Create or fetch Dwolla customer and user's funding source
			const dwollaCustomerId = await createCustomerIfMissing({ id: user.id, email: user.email });
			const userFundingSource = await createFundingSourceIfMissing(dwollaCustomerId);

			// Program destination funding source placeholder. Replace with real FBO or balance.
			const programDestFundingSource = process.env.DWOLLA_PROGRAM_FUNDING_SOURCE || 'urn:dwolla:funding-source:program-demo';

			await initiateTransfer({
				sourceFundingSource: userFundingSource,
				destFundingSource: programDestFundingSource,
				amountCents: refund.amount_cents,
				idempotencyKey,
			});

			// On success: record repayment and mark refund as recouped
			await insert('ledger_entries', {
				refund_id: refund.id,
				type: 'repayment',
				amount_cents: -refund.amount_cents,
				currency: 'usd',
			});

			await update('refunds', { id: refund.id }, { status: 'recouped' });

			return { ok: true };
		});

		logInfo('Collect processed', { refundId: refund.id });
		return NextResponse.json<ApiResponse<{ ok: true }>>({ ok: true, data: { ok: true } });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'unknown error';
		logError('Collect route error', message);
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: message }, { status: 500 });
	}
}

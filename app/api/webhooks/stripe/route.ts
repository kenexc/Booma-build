/*********
Purpose: Stripe webhook endpoint to process refund-related events.
Assumptions: Uses STRIPE_WEBHOOK_SECRET to verify signature with raw body. Placeholder user matching is implemented and will be replaced once accounts are linked.
*********/

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin, insert, selectOne, update } from '@/lib/db';
import { logError, logInfo, logWarn } from '@/lib/logger';
import type { ApiResponse, RefundRecord } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getOrCreateDemoUserId(): Promise<string> {
	const sb = getSupabaseAdmin();
	const email = 'demo@booma.local';
	const { data } = await sb.from('users').select('id').eq('email', email).maybeSingle();
	if (data?.id) return data.id as string;
	const { data: created, error } = await sb
		.from('users')
		.insert({ email })
		.select('id')
		.single();
	if (error) throw error;
	return created.id as string;
}

export async function POST(req: NextRequest) {
	try {
		const secret = process.env.STRIPE_WEBHOOK_SECRET;
		const apiKey = process.env.STRIPE_SECRET_KEY;
		if (!secret || !apiKey) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Stripe env not configured' }, { status: 500 });
		}

		const signature = req.headers.get('stripe-signature');
		if (!signature) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Missing signature' }, { status: 400 });
		}

		const raw = await req.text();
		const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(raw, signature, secret);
		} catch (err) {
			logWarn('Stripe webhook signature verification failed');
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid signature' }, { status: 400 });
		}

		// Placeholder user matching: we currently assign to a demo user until accounts are linked.
		const userId = await getOrCreateDemoUserId();

		const admin = getSupabaseAdmin();

		const eventType = (event as any).type as string;
		if (eventType === 'charge.refunded') {
			const charge = event.data.object as Stripe.Charge;
			const latestRefund = charge.refunds?.data?.[charge.refunds.data.length - 1];
			const amount_cents = latestRefund?.amount ?? charge.amount_refunded ?? 0;
			const chargeId = charge.id;
			const refundId = latestRefund?.id ?? null;
			const card_last4 = (charge.payment_method_details as any)?.card?.last4 ?? null;
			const merchantName = charge.billing_details?.name || charge.description || 'Unknown Merchant';

			let merchantId: string | null = null;
			const existingMerchant = await selectOne<any>('merchants', { name: merchantName, processor: 'stripe' });
			if (existingMerchant?.id) {
				merchantId = existingMerchant.id as string;
			} else {
				const created = await insert('merchants', { name: merchantName, processor: 'stripe' });
				merchantId = (created as any).id as string;
			}

			const existingRefund = await selectOne<RefundRecord>('refunds', { processor_refund_id: refundId ?? chargeId });
			if (existingRefund?.id) {
				await update('refunds', { id: existingRefund.id }, {
					user_id: userId,
					merchant_id: merchantId,
					processor: 'stripe',
					processor_refund_id: refundId ?? chargeId,
					original_charge_id: chargeId,
					amount_cents,
					card_last4,
					status: 'approved',
				});
			} else {
				await insert('refunds', {
					user_id: userId,
					merchant_id: merchantId,
					processor: 'stripe',
					processor_refund_id: refundId ?? chargeId,
					original_charge_id: chargeId,
					amount_cents,
					card_last4,
					status: 'approved',
				});
			}

			return NextResponse.json<ApiResponse<{ handled: boolean }>>({ ok: true, data: { handled: true } });
		}

		if (eventType === 'refund.succeeded') {
			const refund = (event as any).data.object as Stripe.Refund;
			const amount_cents = refund.amount;
			const chargeId = typeof refund.charge === 'string' ? refund.charge : (refund.charge as Stripe.Charge | null)?.id ?? null;
			const refundId = refund.id;
			// We might not have the card last4 here unless charge is expanded; leave null.
			const card_last4 = null;

			// We do not have a reliable merchant field in Refund; use placeholder name.
			const merchantName = 'Unknown Merchant';
			let merchantId: string | null = null;
			const existingMerchant = await selectOne<any>('merchants', { name: merchantName, processor: 'stripe' });
			if (existingMerchant?.id) {
				merchantId = existingMerchant.id as string;
			} else {
				const created = await insert('merchants', { name: merchantName, processor: 'stripe' });
				merchantId = (created as any).id as string;
			}

			const existingRefund = await selectOne<RefundRecord>('refunds', { processor_refund_id: refundId });
			if (existingRefund?.id) {
				await update('refunds', { id: existingRefund.id }, {
					user_id: userId,
					merchant_id: merchantId,
					processor: 'stripe',
					processor_refund_id: refundId,
					original_charge_id: chargeId,
					amount_cents,
					card_last4,
					status: 'approved',
				});
			} else {
				await insert('refunds', {
					user_id: userId,
					merchant_id: merchantId,
					processor: 'stripe',
					processor_refund_id: refundId,
					original_charge_id: chargeId,
					amount_cents,
					card_last4,
					status: 'approved',
				});
			}

			return NextResponse.json<ApiResponse<{ handled: boolean }>>({ ok: true, data: { handled: true } });
		}

		logInfo(`Unhandled Stripe event ${eventType}`);
		return NextResponse.json<ApiResponse<{ handled: boolean }>>({ ok: true, data: { handled: false } });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'unknown error';
		logError('Stripe webhook error', message);
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: message }, { status: 200 });
	}
}

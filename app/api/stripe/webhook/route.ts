/*********
Purpose: Stripe webhook endpoint to handle refund-related events.
Assumptions: Uses STRIPE_WEBHOOK_SECRET for signature verification. Stores idempotent results by Stripe event id.
*********/

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withIdempotency } from '@/lib/idempotency';
import type { ApiResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	try {
		const secret = process.env.STRIPE_WEBHOOK_SECRET;
		const apiKey = process.env.STRIPE_SECRET_KEY;
		if (!secret || !apiKey) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Stripe env vars missing' }, { status: 500 });
		}

		const signature = req.headers.get('stripe-signature');
		if (!signature) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Missing signature' }, { status: 400 });
		}

		const body = await req.text();
		const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
		let event: Stripe.Event;
		try {
			event = stripe.webhooks.constructEvent(body, signature, secret);
		} catch (err) {
			return NextResponse.json<ApiResponse<null>>({ ok: false, error: 'Invalid signature' }, { status: 400 });
		}

		const response = await withIdempotency(event.id, async () => {
			switch (event.type) {
				case 'charge.refunded':
				case 'refund.updated': {
					return { handled: true, type: event.type };
				}
				default:
					return { handled: false, type: event.type };
			}
		});

		return NextResponse.json<ApiResponse<unknown>>({ ok: true, data: response });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'unknown error';
		return NextResponse.json<ApiResponse<null>>({ ok: false, error: message }, { status: 500 });
	}
}

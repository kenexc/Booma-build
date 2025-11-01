/*********
Purpose: Test route to create a Stripe refund for webhook testing.
Assumptions: Uses test mode. Takes charge_id and creates a refund that will trigger webhook events.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: Request) {
	try {
		const { charge_id } = await req.json();
		if (!charge_id) {
			return NextResponse.json({ ok: false, error: 'charge_id required' }, { status: 400 });
		}

		const refund = await stripe.refunds.create({ charge: charge_id });
		return NextResponse.json({ ok: true, refund_id: refund.id, status: refund.status });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


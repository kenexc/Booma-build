/*********
Purpose: Test route to create a Stripe test charge for webhook testing.
Assumptions: Uses test mode with test card. Returns payment intent and charge ID for testing refund webhooks.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST() {
	try {
		// $42.00 test charge
		const pi = await stripe.paymentIntents.create({
			amount: 4200,
			currency: 'usd',
			automatic_payment_methods: {
				enabled: true,
				allow_redirects: 'never',
			},
			payment_method: 'pm_card_visa', // test card
			confirm: true,
		});

		// get the underlying charge id
		const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : null;

		return NextResponse.json({
			ok: true,
			payment_intent: pi.id,
			charge_id: chargeId,
			amount_cents: 4200,
		});
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


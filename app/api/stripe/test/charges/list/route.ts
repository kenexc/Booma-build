/*********
Purpose: Test route to list recent Stripe charges for debugging and testing.
Assumptions: Uses test mode. Returns last 10 charges with key fields.
*********/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function GET() {
	try {
		// Only show the most recent 1 charge for clean demo experience
		// This ensures new demo users only see their own charge
		const charges = await stripe.charges.list({ 
			limit: 1
		});
		const rows = charges.data.map(c => ({
			id: c.id,
			amount_cents: c.amount,
			currency: c.currency,
			status: c.status,
			refunded: c.refunded,
			payment_intent: typeof c.payment_intent === 'string' ? c.payment_intent : c.payment_intent?.id,
			created: c.created,
		}));
		return NextResponse.json({ ok: true, charges: rows });
	} catch (e: any) {
		return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
	}
}


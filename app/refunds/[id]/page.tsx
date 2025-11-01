/*********
Purpose: Show refund details with computed fee and net payout, plus action buttons for demo/testing.
Assumptions: Calls API endpoints and uses a small client component for actions.
*********/

import ActionButtons from '@/components/ActionButtons';

interface ApiResponse<T> { ok: boolean; data?: T; error?: string }

interface RefundDetail {
	id: string;
	user_id: string;
	merchant_id?: string | null;
	processor: 'stripe';
	processor_refund_id?: string | null;
	original_charge_id?: string | null;
	amount_cents: number;
	card_last4?: string | null;
	status: string;
	posted_at?: string | null;
	created_at?: string | null;
	fee_cents: number;
	net_payout_cents: number;
}

function getBaseUrl(): string {
	const fromEnv = process.env.NEXT_PUBLIC_BASE_URL;
	if (fromEnv && fromEnv.trim()) return fromEnv;
	const vercel = process.env.VERCEL_URL;
	if (vercel && vercel.trim()) return `https://${vercel}`;
	return 'http://localhost:3000';
}

async function loadRefund(id: string): Promise<RefundDetail | null> {
	const res = await fetch(`${getBaseUrl()}/api/refunds/${id}`, { cache: 'no-store' });
	if (!res.ok) return null;
	const json = (await res.json()) as ApiResponse<RefundDetail>;
	return json.data ?? null;
}

export default async function RefundDetailPage({ params }: { params: { id: string } }) {
	const refund = await loadRefund(params.id);
	if (!refund) return <div>Not found</div>;
	return (
		<div>
			<h2>Refund {refund.id}</h2>
			<p>Amount: ${(refund.amount_cents / 100).toFixed(2)}</p>
			<p>Fee: ${(refund.fee_cents / 100).toFixed(2)}</p>
			<p>Net Payout: ${(refund.net_payout_cents / 100).toFixed(2)}</p>
			<p>Status: {refund.status}</p>
			<ActionButtons refundId={refund.id} status={refund.status} />
		</div>
	);
}

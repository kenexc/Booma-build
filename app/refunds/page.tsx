/*********
Purpose: List refunds for quick demo to investors/admins.
Assumptions: Uses server-side fetch to call API route.
*********/

interface ApiResponse<T> { ok: boolean; data?: T; error?: string }

interface RefundRow {
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
}

function getBaseUrl(): string {
	const fromEnv = process.env.NEXT_PUBLIC_BASE_URL;
	if (fromEnv && fromEnv.trim()) return fromEnv;
	const vercel = process.env.VERCEL_URL;
	if (vercel && vercel.trim()) return `https://${vercel}`;
	return 'http://localhost:3000';
}

async function loadRefunds(): Promise<RefundRow[]> {
	const res = await fetch(`${getBaseUrl()}/api/refunds/list`, { cache: 'no-store' });
	if (!res.ok) return [];
	const json = (await res.json()) as ApiResponse<RefundRow[]>;
	return json.data ?? [];
}

export default async function RefundsPage() {
	const refunds = await loadRefunds();
	return (
		<div>
			<h2>Refunds</h2>
			<table style={{ width: '100%', borderCollapse: 'collapse' }}>
				<thead>
					<tr>
						<th style={{ textAlign: 'left' }}>ID</th>
						<th style={{ textAlign: 'left' }}>Amount</th>
						<th style={{ textAlign: 'left' }}>Status</th>
						<th style={{ textAlign: 'left' }}>Card</th>
						<th style={{ textAlign: 'left' }}>Created</th>
					</tr>
				</thead>
				<tbody>
					{refunds.map((r) => (
						<tr key={r.id}>
							<td><a href={`/refunds/${r.id}`}>{r.id.slice(0, 8)}…</a></td>
							<td>${(r.amount_cents / 100).toFixed(2)}</td>
							<td>{r.status}</td>
							<td>{r.card_last4 ? `•••• ${r.card_last4}` : 'n/a'}</td>
							<td>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

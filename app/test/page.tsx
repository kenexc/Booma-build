'use client';

import { useEffect, useState } from 'react';

type ChargeRow = {
	id: string;
	amount_cents: number;
	currency: string;
	status: string;
	refunded: boolean;
	payment_intent?: string | null;
	created: number;
};

type RefundRow = {
	id: string;
	amount_cents: number;
	status: string;
	processor_refund_id?: string | null;
	created_at?: string | null;
};

export default function TestConsole() {
	const [charges, setCharges] = useState<ChargeRow[]>([]);
	const [refunds, setRefunds] = useState<RefundRow[]>([]);
	const [selectedRefundId, setSelectedRefundId] = useState<string>('');
	const [log, setLog] = useState<string[]>([]);
	const [creating, setCreating] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingRefunds, setLoadingRefunds] = useState(false);
	const [plaidAccessToken, setPlaidAccessToken] = useState<string>('');

	async function loadCharges() {
		setRefreshing(true);
		const res = await fetch('/api/stripe/test/charges/list', { cache: 'no-store' });
		const j = await res.json();
		if (j.ok) setCharges(j.charges);
		setRefreshing(false);
	}

	async function loadRefunds() {
		setLoadingRefunds(true);
		const res = await fetch('/api/refunds/list', { cache: 'no-store' });
		const j = await res.json();
		if (j.ok) {
			setRefunds(j.data || []);
			if (j.data && j.data.length > 0 && !selectedRefundId) {
				setSelectedRefundId(j.data[0].id);
			}
		}
		setLoadingRefunds(false);
	}

	useEffect(() => {
		loadCharges();
		loadRefunds();
	}, []);

	async function createCharge() {
		setCreating(true);
		setLog(l => ['Creating $42 test charge...', ...l]);
		const res = await fetch('/api/stripe/test/charge', { method: 'POST' });
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`Charge created: ${j.charge_id}`, ...l]);
			await loadCharges();
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
		setCreating(false);
	}

	async function refundCharge(id: string) {
		setLog(l => [`Requesting refund for ${id}...`, ...l]);
		const res = await fetch('/api/stripe/test/refund', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ charge_id: id }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`Refund requested: ${j.refund_id}. Wait for webhook...`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
		setTimeout(() => {
			loadCharges();
			loadRefunds();
		}, 2000);
	}

	async function advanceRefund() {
		if (!selectedRefundId) return setLog(l => ['No refund selected', ...l]);
		setLog(l => ['Advancing refund...', ...l]);
		const res = await fetch('/api/dwolla/sim/advance', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`Advance completed: ${j.data?.transfer_id}`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}

	async function createPlaidLink() {
		setLog(l => ['Creating Plaid sandbox link...', ...l]);
		const res = await fetch('/api/plaid/sandbox/link', { method: 'POST' });
		const j = await res.json();
		if (j.ok) {
			setPlaidAccessToken(j.access_token);
			setLog(l => [`Plaid link created. Access token saved.`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
	}

	async function firePlaidWebhook() {
		if (!plaidAccessToken) {
			setLog(l => ['No Plaid access token. Create link first.', ...l]);
			return;
		}
		setLog(l => ['Firing Plaid webhook...', ...l]);
		const res = await fetch('/api/plaid/sandbox/transactions/fire', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ access_token: plaidAccessToken }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => ['Plaid webhook fired. Checking refunds...', ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
		setTimeout(loadRefunds, 2000);
	}

	async function collectRefund() {
		if (!selectedRefundId) return setLog(l => ['No refund selected', ...l]);
		setLog(l => ['Collecting refund...', ...l]);
		const res = await fetch('/api/dwolla/sim/collect', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`Collect completed: ${j.data?.transfer_id}`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}

	const selectedRefund = refunds.find(r => r.id === selectedRefundId);

	return (
		<main style={{ padding: 24, maxWidth: 1024, margin: '0 auto' }}>
			<h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Booma Test Console</h1>
			<p style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
				Create a Stripe test charge, refund it here, let the webhook write your refund row, then use your Advance → Posted → Collect actions.
			</p>

			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
				<button onClick={createCharge} disabled={creating} style={{ padding: '8px 12px', borderRadius: 4, background: '#000', color: '#fff', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.6 : 1 }}>
					{creating ? 'Creating…' : 'Create $42 test charge'}
				</button>
				<button onClick={loadCharges} disabled={refreshing} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}>
					{refreshing ? 'Refreshing…' : 'Refresh charges'}
				</button>
				<button onClick={loadRefunds} disabled={loadingRefunds} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: loadingRefunds ? 'not-allowed' : 'pointer', opacity: loadingRefunds ? 0.6 : 1 }}>
					{loadingRefunds ? 'Loading…' : 'Refresh refunds'}
				</button>
				<a href="/refunds" style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', textDecoration: 'none', color: '#000' }}>Open Refunds table</a>
			</div>

			<h2 style={{ fontSize: 18, fontWeight: 500, marginTop: 24 }}>Recent charges</h2>
			<div style={{ marginTop: 8, border: '1px solid #ccc', borderRadius: 4 }}>
				<table style={{ width: '100%', fontSize: 14 }}>
					<thead style={{ background: '#f5f5f5' }}>
						<tr>
							<th style={{ textAlign: 'left', padding: 8 }}>Charge</th>
							<th style={{ textAlign: 'left', padding: 8 }}>Amount</th>
							<th style={{ textAlign: 'left', padding: 8 }}>Status</th>
							<th style={{ textAlign: 'left', padding: 8 }}>Refunded</th>
							<th style={{ textAlign: 'left', padding: 8 }}>Action</th>
						</tr>
					</thead>
					<tbody>
						{charges.map(c => (
							<tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
								<td style={{ padding: 8 }}>{c.id}</td>
								<td style={{ padding: 8 }}>${(c.amount_cents / 100).toFixed(2)} {c.currency.toUpperCase()}</td>
								<td style={{ padding: 8 }}>{c.status}</td>
								<td style={{ padding: 8 }}>{c.refunded ? 'Yes' : 'No'}</td>
								<td style={{ padding: 8 }}>
									<button
										onClick={() => refundCharge(c.id)}
										disabled={c.refunded}
										style={{ padding: '4px 8px', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', cursor: c.refunded ? 'not-allowed' : 'pointer', opacity: c.refunded ? 0.5 : 1 }}
									>
										Refund
									</button>
								</td>
							</tr>
						))}
						{charges.length === 0 && (
							<tr><td style={{ padding: 8 }} colSpan={5}>No charges yet.</td></tr>
						)}
					</tbody>
				</table>
			</div>

			<h2 style={{ fontSize: 18, fontWeight: 500, marginTop: 24 }}>Refunds & Actions</h2>
			<div style={{ marginTop: 8, border: '1px solid #ccc', borderRadius: 4, padding: 16 }}>
				<div style={{ marginBottom: 12 }}>
					<label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Selected Refund:</label>
					<select
						value={selectedRefundId}
						onChange={(e) => setSelectedRefundId(e.target.value)}
						style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
					>
						{refunds.length === 0 ? (
							<option value="">No refunds yet</option>
						) : (
							refunds.map(r => (
								<option key={r.id} value={r.id}>
									{r.id.slice(0, 8)}… - ${(r.amount_cents / 100).toFixed(2)} - {r.status}
								</option>
							))
						)}
					</select>
				</div>
				{selectedRefund && (
					<div style={{ marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 14 }}>
						<strong>Status:</strong> {selectedRefund.status} | <strong>Amount:</strong> ${(selectedRefund.amount_cents / 100).toFixed(2)}
					</div>
				)}
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<button
						onClick={advanceRefund}
						disabled={!selectedRefundId || selectedRefund?.status !== 'approved'}
						style={{ padding: '8px 12px', borderRadius: 4, background: '#10b981', color: '#fff', border: 'none', cursor: (!selectedRefundId || selectedRefund?.status !== 'approved') ? 'not-allowed' : 'pointer', opacity: (!selectedRefundId || selectedRefund?.status !== 'approved') ? 0.5 : 1 }}
					>
						Advance
					</button>
					<button
						onClick={createPlaidLink}
						style={{ padding: '8px 12px', borderRadius: 4, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
					>
						Create Plaid Link
					</button>
					<button
						onClick={firePlaidWebhook}
						disabled={!plaidAccessToken || (selectedRefund?.status !== 'instant_sent')}
						style={{ padding: '8px 12px', borderRadius: 4, background: '#8b5cf6', color: '#fff', border: 'none', cursor: (!plaidAccessToken || selectedRefund?.status !== 'instant_sent') ? 'not-allowed' : 'pointer', opacity: (!plaidAccessToken || selectedRefund?.status !== 'instant_sent') ? 0.5 : 1 }}
					>
						Simulate Posted (Plaid)
					</button>
					<button
						onClick={collectRefund}
						disabled={!selectedRefundId || (selectedRefund?.status !== 'posted' && selectedRefund?.status !== 'instant_sent')}
						style={{ padding: '8px 12px', borderRadius: 4, background: '#f59e0b', color: '#fff', border: 'none', cursor: (!selectedRefundId || (selectedRefund?.status !== 'posted' && selectedRefund?.status !== 'instant_sent')) ? 'not-allowed' : 'pointer', opacity: (!selectedRefundId || (selectedRefund?.status !== 'posted' && selectedRefund?.status !== 'instant_sent')) ? 0.5 : 1 }}
					>
						Collect
					</button>
				</div>
			</div>

			<h2 style={{ fontSize: 18, fontWeight: 500, marginTop: 24 }}>Log</h2>
			<ul style={{ marginTop: 8, listStyle: 'disc', paddingLeft: 20 }}>
				{log.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
			</ul>
		</main>
	);
}

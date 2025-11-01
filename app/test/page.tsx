/*********
Purpose: Test console UI for creating Stripe test charges and refunds to trigger webhooks.
Assumptions: Client-side component with local state for testing flows.
*********/
'use client';

import { useState } from 'react';

export default function TestConsole() {
	const [chargeId, setChargeId] = useState<string>('');
	const [refundId, setRefundId] = useState<string>('');
	const [log, setLog] = useState<string[]>([]);

	async function createCharge() {
		setLog(l => ['Creating Stripe test charge...', ...l]);
		const res = await fetch('/api/stripe/test/charge', { method: 'POST' });
		const j = await res.json();
		if (j.ok) {
			setChargeId(j.charge_id);
			setLog(l => [`Charge created: ${j.charge_id}`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
	}

	async function refundCharge() {
		if (!chargeId) return setLog(l => ['No charge_id yet', ...l]);
		setLog(l => ['Requesting Stripe refund...', ...l]);
		const res = await fetch('/api/stripe/test/refund', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ charge_id: chargeId }),
		});
		const j = await res.json();
		if (j.ok) {
			setRefundId(j.refund_id);
			setLog(l => [`Refund requested: ${j.refund_id}. Wait for webhook...`, ...l]);
		} else {
			setLog(l => [`Error: ${j.error}`, ...l]);
		}
	}

	return (
		<main style={{ padding: 24 }}>
			<h1>Booma Test Console</h1>
			<p>Create a Stripe test charge, refund it, and let the webhook create a refund record.</p>

			<div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
				<button onClick={createCharge}>Create $42 test charge</button>
				<button onClick={refundCharge} disabled={!chargeId}>Refund that charge</button>
			</div>

			<div style={{ marginTop: 12 }}>
				<div>charge_id: <code>{chargeId || '(none)'}</code></div>
				<div>refund_id: <code>{refundId || '(none)'}</code></div>
			</div>

			<h3 style={{ marginTop: 24 }}>Log</h3>
			<ul>
				{log.map((line, i) => <li key={i}>{line}</li>)}
			</ul>

			<p style={{ marginTop: 24 }}>
				After webhook fires, open <a href="/refunds">Refunds</a> to see the new record with status <b>approved</b>.  
				Then click your existing buttons for <b>Advance</b>, trigger <b>Posted</b> (via Plaid sandbox webhook or the demo route), and <b>Collect</b>.
			</p>
		</main>
	);
}


/*********
Purpose: Client action buttons to trigger demo transitions and ACH actions.
Assumptions: For demo only, no auth.
*********/
'use client';

import { useState } from 'react';

export default function ActionButtons({ refundId, status }: { refundId: string; status: string }) {
	const [loading, setLoading] = useState<string | null>(null);
	async function call(path: string) {
		setLoading(path);
		try {
			const res = await fetch(path, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refund_id: refundId }),
			});
			if (!res.ok) alert(`Request failed: ${res.status}`);
		} finally {
			setLoading(null);
			// naive refresh
			location.reload();
		}
	}
	return (
		<div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
			<button onClick={() => call('/api/demo/approve')} disabled={loading !== null || status !== 'initiated'}>Approve</button>
			<button onClick={() => call('/api/advance')} disabled={loading !== null || status !== 'approved'}>Advance</button>
			<button onClick={() => call('/api/demo/post')} disabled={loading !== null || status !== 'instant_sent'}>Mark Posted</button>
			<button onClick={() => call('/api/collect')} disabled={loading !== null || (status !== 'posted' && status !== 'instant_sent')}>Collect</button>
			<button onClick={() => call('/api/demo/recoup')} disabled={loading !== null || status !== 'posted'}>Mark Recouped</button>
		</div>
	);
}

/*********
Purpose: Client action buttons to trigger demo transitions and ACH actions with polished UI.
Assumptions: For demo only, no auth.
*********/
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

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
			setTimeout(() => location.reload(), 500);
		}
	}
	return (
		<div className="flex flex-wrap gap-3">
			<Button
				variant="outline"
				onClick={() => call('/api/demo/approve')}
				disabled={loading !== null || status !== 'initiated'}
				size="sm"
			>
				<CheckCircle2 className="h-4 w-4 mr-2" />
				{loading === '/api/demo/approve' ? 'Approving...' : 'Approve'}
			</Button>
			<Button
				variant="default"
				onClick={() => call('/api/advance')}
				disabled={loading !== null || status !== 'approved'}
				size="sm"
			>
				<ArrowRight className="h-4 w-4 mr-2" />
				{loading === '/api/advance' ? 'Advancing...' : 'Advance'}
			</Button>
			<Button
				variant="outline"
				onClick={() => call('/api/demo/post')}
				disabled={loading !== null || status !== 'instant_sent'}
				size="sm"
			>
				<Clock className="h-4 w-4 mr-2" />
				{loading === '/api/demo/post' ? 'Posting...' : 'Mark Posted'}
			</Button>
			<Button
				variant="destructive"
				onClick={() => call('/api/collect')}
				disabled={loading !== null || (status !== 'posted' && status !== 'instant_sent')}
				size="sm"
			>
				<TrendingUp className="h-4 w-4 mr-2" />
				{loading === '/api/collect' ? 'Collecting...' : 'Collect'}
			</Button>
			<Button
				variant="secondary"
				onClick={() => call('/api/demo/recoup')}
				disabled={loading !== null || status !== 'posted'}
				size="sm"
			>
				<CheckCircle2 className="h-4 w-4 mr-2" />
				{loading === '/api/demo/recoup' ? 'Recouping...' : 'Mark Recouped'}
			</Button>
		</div>
	);
}

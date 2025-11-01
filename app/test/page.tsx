'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, RefreshCw, Play, CheckCircle2, XCircle, CreditCard, TrendingUp } from 'lucide-react';

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

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'approved':
		case 'succeeded':
		case 'recouped':
			return 'success';
		case 'instant_sent':
		case 'posted':
			return 'default';
		case 'failed':
		case 'refunded':
			return 'destructive';
		default:
			return 'secondary';
	}
}

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
			setLog(l => [`✓ Charge created: ${j.charge_id}`, ...l]);
			await loadCharges();
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
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
			setLog(l => [`✓ Refund requested: ${j.refund_id}. Waiting for webhook...`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		setTimeout(() => {
			loadCharges();
			loadRefunds();
		}, 2000);
	}

	async function advanceRefund() {
		if (!selectedRefundId) return setLog(l => ['✗ No refund selected', ...l]);
		setLog(l => ['Advancing refund...', ...l]);
		const res = await fetch('/api/dwolla/sim/advance', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`✓ Advance completed: ${j.data?.transfer_id}`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}

	async function createPlaidLink() {
		setLog(l => ['Creating Plaid sandbox link...', ...l]);
		const res = await fetch('/api/plaid/sandbox/link', { method: 'POST' });
		const j = await res.json();
		if (j.ok) {
			setPlaidAccessToken(j.access_token);
			setLog(l => [`✓ Plaid link created. Access token saved.`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
	}

	async function firePlaidWebhook() {
		if (!plaidAccessToken) {
			setLog(l => ['✗ No Plaid access token. Create link first.', ...l]);
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
			setLog(l => ['✓ Plaid webhook fired. Checking refunds...', ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		setTimeout(loadRefunds, 2000);
	}

	async function collectRefund() {
		if (!selectedRefundId) return setLog(l => ['✗ No refund selected', ...l]);
		setLog(l => ['Collecting refund...', ...l]);
		const res = await fetch('/api/dwolla/sim/collect', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`✓ Collect completed: ${j.data?.transfer_id}`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}

	const selectedRefund = refunds.find(r => r.id === selectedRefundId);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Test Console</h1>
				<p className="text-muted-foreground mt-2">Manage test charges, refunds, and simulate the complete refund flow</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="h-5 w-5" />
								Stripe Charges
							</CardTitle>
							<Button variant="outline" size="sm" onClick={loadCharges} disabled={refreshing}>
								<RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
								Refresh
							</Button>
						</div>
						<CardDescription>Recent test charges from Stripe sandbox</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2 mb-4">
							<Button onClick={createCharge} disabled={creating} className="flex-1">
								{creating ? (
									<>
										<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
										Creating...
									</>
								) : (
									<>
										<Play className="h-4 w-4 mr-2" />
										Create $42 Charge
									</>
								)}
							</Button>
						</div>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Charge ID</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Refunded</TableHead>
										<TableHead className="w-[100px]">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{charges.length === 0 ? (
										<TableRow>
											<TableCell colSpan={5} className="text-center text-muted-foreground py-8">
												No charges yet. Create one to get started.
											</TableCell>
										</TableRow>
									) : (
										charges.map(c => (
											<TableRow key={c.id}>
												<TableCell className="font-mono text-xs">{c.id.slice(0, 16)}...</TableCell>
												<TableCell className="font-medium">${(c.amount_cents / 100).toFixed(2)}</TableCell>
												<TableCell>
													<Badge variant={c.status === 'succeeded' ? 'success' : 'secondary'}>{c.status}</Badge>
												</TableCell>
												<TableCell>
													{c.refunded ? (
														<Badge variant="success">
															<CheckCircle2 className="h-3 w-3 mr-1" />
															Yes
														</Badge>
													) : (
														<Badge variant="outline">
															<XCircle className="h-3 w-3 mr-1" />
															No
														</Badge>
													)}
												</TableCell>
												<TableCell>
													<Button
														size="sm"
														variant="outline"
														onClick={() => refundCharge(c.id)}
														disabled={c.refunded}
													>
														Refund
													</Button>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<TrendingUp className="h-5 w-5" />
								Refund Actions
							</CardTitle>
							<Button variant="outline" size="sm" onClick={loadRefunds} disabled={loadingRefunds}>
								<RefreshCw className={`h-4 w-4 mr-2 ${loadingRefunds ? 'animate-spin' : ''}`} />
								Refresh
							</Button>
						</div>
						<CardDescription>Manage refund lifecycle and simulate payment flows</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Selected Refund</label>
							<select
								value={selectedRefundId}
								onChange={(e) => setSelectedRefundId(e.target.value)}
								disabled={refunds.length === 0}
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
							<div className="p-4 rounded-lg bg-muted">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Status</span>
									<Badge variant={getStatusBadgeVariant(selectedRefund.status)}>{selectedRefund.status}</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Amount</span>
									<span className="text-sm font-semibold">${(selectedRefund.amount_cents / 100).toFixed(2)}</span>
								</div>
							</div>
						)}

						<Separator />

						<div className="grid grid-cols-2 gap-2">
							<Button
								onClick={advanceRefund}
								disabled={!selectedRefundId || selectedRefund?.status !== 'approved'}
								variant="default"
								className="w-full"
							>
								<ArrowRight className="h-4 w-4 mr-2" />
								Advance
							</Button>
							<Button onClick={createPlaidLink} variant="secondary" className="w-full">
								Plaid Link
							</Button>
							<Button
								onClick={firePlaidWebhook}
								disabled={!plaidAccessToken || selectedRefund?.status !== 'instant_sent'}
								variant="secondary"
								className="w-full"
							>
								Simulate Posted
							</Button>
							<Button
								onClick={collectRefund}
								disabled={!selectedRefundId || (selectedRefund?.status !== 'posted' && selectedRefund?.status !== 'instant_sent')}
								variant="destructive"
								className="w-full"
							>
								Collect
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Activity Log</CardTitle>
					<CardDescription>Real-time log of all test operations</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border bg-muted/50 p-4 max-h-[300px] overflow-y-auto">
						{log.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
						) : (
							<ul className="space-y-1 text-sm font-mono">
								{log.map((line, i) => (
									<li key={i} className={line.startsWith('✓') ? 'text-green-600' : line.startsWith('✗') ? 'text-red-600' : ''}>
										{line}
									</li>
								))}
							</ul>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

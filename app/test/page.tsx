'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, RefreshCw, Play, CheckCircle2, XCircle, CreditCard, TrendingUp, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';

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
	original_charge_id?: string | null;
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

function getStatusOrder(status: string): number {
	const order: Record<string, number> = {
		initiated: 0,
		approved: 1,
		instant_sent: 2,
		posted: 3,
		recouped: 4,
	};
	return order[status] ?? -1;
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
	const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
	const chargesRef = useRef<ChargeRow[]>([]);

	async function loadCharges() {
		setRefreshing(true);
		// Don't clear charges first - causes refunds to disappear temporarily
		const res = await fetch('/api/stripe/test/charges/list', { cache: 'no-store' });
		const j = await res.json();
		if (j.ok) {
			const newCharges = j.charges;
			setCharges(newCharges);
			chargesRef.current = newCharges; // Update ref
			// Reload refunds after charges load to filter by current charges
			const chargeIds = newCharges.map((c: ChargeRow) => c.id);
			loadRefunds(chargeIds);
		}
		setRefreshing(false);
	}

	async function loadRefunds(chargeIdsOverride?: string[]) {
		setLoadingRefunds(true);
		const res = await fetch('/api/refunds/list', { cache: 'no-store' });
		const j = await res.json();
		if (j.ok) {
			const allRefunds = j.data || [];
			// Only show refunds that match the currently visible charge(s)
			// If no charges, show no refunds
			const chargeIds = chargeIdsOverride || chargesRef.current.map(c => c.id);
			const filteredRefunds = chargeIds.length > 0 
				? allRefunds.filter((r: RefundRow) => 
					r.original_charge_id && chargeIds.includes(r.original_charge_id)
				)
				: [];
			setRefunds(filteredRefunds);
			// Always auto-select the first/most recent refund if list changes
			if (filteredRefunds.length > 0) {
				const firstRefundId = filteredRefunds[0].id;
				// Update selection if current selection doesn't exist in list, or if no selection
				if (!selectedRefundId || !filteredRefunds.find((r: RefundRow) => r.id === selectedRefundId)) {
					setSelectedRefundId(firstRefundId);
				}
			} else {
				// Clear selection if no refunds match
				setSelectedRefundId('');
			}
		}
		setLoadingRefunds(false);
	}

	useEffect(() => {
		loadCharges();
		loadRefunds();
	}, []); // Only run once on mount

	useEffect(() => {
		if (!autoRefreshPaused) {
			const interval = setInterval(() => {
				// Use ref to get latest charges value
				const currentChargeIds = chargesRef.current.map(c => c.id);
				loadRefunds(currentChargeIds.length > 0 ? currentChargeIds : undefined);
			}, 3000); // Auto-refresh refunds every 3 seconds when not paused
			return () => clearInterval(interval);
		}
	}, [autoRefreshPaused]); // Only re-run when auto-refresh pause state changes

	async function createCharge() {
		setCreating(true);
		setAutoRefreshPaused(false); // Resume auto-refresh when creating new charge
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
		setAutoRefreshPaused(false); // Resume auto-refresh when refunding
		setLog(l => [`Requesting refund for charge ${id.slice(0, 16)}...`, ...l]);
		const res = await fetch('/api/stripe/test/refund', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ charge_id: id }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`✓ Refund created: ${j.refund_id}. Waiting for webhook to create refund record...`, ...l]);
			// Refresh charges immediately to show refunded status
			await loadCharges();
			// Poll for refund record - webhook might take a moment
			// Always pass the charge ID explicitly so refunds aren't filtered out
			setTimeout(async () => {
				await loadRefunds([id]);
				// Check again after a bit longer
				setTimeout(async () => {
					await loadRefunds([id]);
				}, 3000);
			}, 2000);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
	}

	async function advanceRefund() {
		if (!selectedRefundId) return setLog(l => ['✗ No refund selected', ...l]);
		setLog(l => ['🚀 Advancing refund (simulating Dwolla ACH)...', ...l]);
		const res = await fetch('/api/dwolla/sim/advance', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`✓ Advance completed! Refund status: instant_sent`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}


	async function firePlaidWebhook() {
		if (!selectedRefundId) {
			setLog(l => ['✗ No refund selected', ...l]);
			return;
		}
		if (selectedRefund?.status !== 'instant_sent') {
			setLog(l => [`✗ Refund status must be 'instant_sent', current: ${selectedRefund?.status || 'unknown'}`, ...l]);
			return;
		}
		setLog(l => ['📨 Simulating posted transaction (marking refund as posted)...', ...l]);
		try {
			const res = await fetch('/api/demo/post', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ refund_id: selectedRefundId }),
			});
			const j = await res.json();
			if (j.ok) {
				setLog(l => [`✓ Refund status updated to: posted`, ...l]);
				// Get current charge IDs to ensure refund stays visible
				const currentChargeIds = chargesRef.current.map(c => c.id);
				await loadRefunds(currentChargeIds.length > 0 ? currentChargeIds : undefined);
			} else {
				setLog(l => [`✗ Error: ${j.error || 'Unknown error'}`, ...l]);
			}
		} catch (error: any) {
			setLog(l => [`✗ Network error: ${error.message || 'Failed to update'}`, ...l]);
		}
	}

	async function collectRefund() {
		if (!selectedRefundId) return setLog(l => ['✗ No refund selected', ...l]);
		setLog(l => ['💸 Collecting repayment (simulating Dwolla ACH debit)...', ...l]);
		const res = await fetch('/api/dwolla/sim/collect', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ refund_id: selectedRefundId }),
		});
		const j = await res.json();
		if (j.ok) {
			setLog(l => [`✓ Collection completed! Refund status: recouped`, ...l]);
		} else {
			setLog(l => [`✗ Error: ${j.error}`, ...l]);
		}
		await loadRefunds();
	}

	const selectedRefund = refunds.find(r => r.id === selectedRefundId);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Booma Demo Console</h1>
				<p className="text-muted-foreground mt-2">
					Watch the complete refund flow: Charge → Refund → Advance → Posted → Collect
				</p>
			</div>

			{/* Step-by-step guide */}
			<Card className="border-primary/20 bg-primary/5">
				<CardHeader>
					<CardTitle className="text-lg">Quick Start Guide</CardTitle>
					<CardDescription>Follow these steps to see the complete flow</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3 text-sm">
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
							<div>
								<p className="font-medium">Create a test charge</p>
								<p className="text-muted-foreground text-xs">Click "Create $42 Charge" below</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
							<div>
								<p className="font-medium">Refund the charge</p>
								<p className="text-muted-foreground text-xs">Click "Refund" on the charge. Webhook creates refund record with status "approved"</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
							<div>
								<p className="font-medium">Select the refund & advance it</p>
								<p className="text-muted-foreground text-xs">Pick the refund from dropdown, click "Advance" to simulate ACH credit</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
							<div>
								<p className="font-medium">Simulate bank posting</p>
								<p className="text-muted-foreground text-xs">Click "Simulate Posted" to trigger bank transaction (Plaid link is created automatically)</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
							<div>
								<p className="font-medium">Collect repayment</p>
								<p className="text-muted-foreground text-xs">Click "Collect" to simulate ACH debit and complete the cycle</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="h-5 w-5" />
								Stripe Charges
							</CardTitle>
							<div className="flex gap-2">
								<Button variant="outline" size="sm" onClick={() => {
									setCharges([]);
									setRefunds([]);
									setSelectedRefundId('');
									setLog([]);
									setAutoRefreshPaused(true); // Pause auto-refresh after clearing
								}}>
									Clear All
								</Button>
								<Button variant="outline" size="sm" onClick={loadCharges} disabled={refreshing}>
									<RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
									Refresh
								</Button>
							</div>
						</div>
						<CardDescription>Create test charges and refund them. Only shows the most recent charge you created.</CardDescription>
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
								Refund Lifecycle
							</CardTitle>
							<Button variant="outline" size="sm" onClick={() => {
								setAutoRefreshPaused(false); // Resume auto-refresh when manually refreshing
								loadRefunds();
							}} disabled={loadingRefunds}>
								<RefreshCw className={`h-4 w-4 mr-2 ${loadingRefunds ? 'animate-spin' : ''}`} />
								Refresh
							</Button>
						</div>
						<CardDescription>Watch refund progress through the lifecycle</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{refunds.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<p className="text-sm">No refunds yet.</p>
								<p className="text-xs mt-2">Create a charge and refund it to see refund records appear here.</p>
							</div>
						) : (
							<>
								<div className="space-y-2">
									<label className="text-sm font-medium">Select Refund to Manage</label>
									<select
										value={selectedRefundId || ''}
										onChange={(e) => setSelectedRefundId(e.target.value)}
										className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{refunds.map(r => (
											<option key={r.id} value={r.id}>
												${(r.amount_cents / 100).toFixed(2)} - {r.status} - {r.id.slice(0, 8)}...
											</option>
										))}
									</select>
								</div>

								{selectedRefund ? (
									<>
										<Card className="bg-muted/50">
											<CardContent className="pt-6">
												<div className="space-y-4">
													<div className="flex items-center justify-between">
														<span className="text-sm font-medium text-muted-foreground">Current Status</span>
														<Badge variant={getStatusBadgeVariant(selectedRefund.status)} className="text-base px-3 py-1">
															{selectedRefund.status}
														</Badge>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-sm font-medium text-muted-foreground">Amount</span>
														<span className="text-lg font-bold">${(selectedRefund.amount_cents / 100).toFixed(2)}</span>
													</div>
													<Separator />
													<div className="space-y-2">
														<p className="text-xs font-medium text-muted-foreground">Status Progression</p>
														<div className="flex items-center gap-2 text-xs">
															{['initiated', 'approved', 'instant_sent', 'posted', 'recouped'].map((status, i) => {
																const currentOrder = getStatusOrder(selectedRefund.status);
																const statusOrder = getStatusOrder(status);
																const isActive = statusOrder <= currentOrder;
																const isCurrent = status === selectedRefund.status;
																return (
																	<div key={status} className="flex items-center">
																		<div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
																			{i + 1}
																		</div>
																		<span className={`ml-2 ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
																			{status.replace('_', ' ')}
																		</span>
																		{i < 4 && <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />}
																	</div>
																);
															})}
														</div>
													</div>
												</div>
											</CardContent>
										</Card>

										<Separator />

										<div className="space-y-2">
											<p className="text-xs font-medium text-muted-foreground mb-2">Next Actions</p>
											<div className="grid grid-cols-2 gap-2">
												<Button
													onClick={advanceRefund}
													disabled={selectedRefund?.status !== 'approved'}
													variant="default"
													size="sm"
													className="w-full"
												>
													<ArrowDownCircle className="h-4 w-4 mr-2" />
													{selectedRefund?.status !== 'approved' ? 'Waiting for approved...' : 'Advance'}
												</Button>
												<Button
													onClick={() => {
														console.log('Simulate Posted clicked', selectedRefundId, selectedRefund?.status);
														firePlaidWebhook();
													}}
													disabled={!selectedRefundId || selectedRefund?.status !== 'instant_sent'}
													variant="secondary"
													size="sm"
													className="w-full"
												>
													<Clock className="h-4 w-4 mr-2" />
													{selectedRefund?.status !== 'instant_sent' ? 'Waiting for instant_sent...' : 'Simulate Posted'}
												</Button>
												<Button
													onClick={collectRefund}
													disabled={selectedRefund?.status !== 'posted' && selectedRefund?.status !== 'instant_sent'}
													variant="destructive"
													size="sm"
													className="w-full col-span-2"
												>
													<ArrowUpCircle className="h-4 w-4 mr-2" />
													Collect
												</Button>
											</div>
										</div>
									</>
								) : (
									<div className="p-4 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
										<p>Select a refund from the dropdown above</p>
									</div>
								)}
							</>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Activity Log</CardTitle>
					<CardDescription>Real-time log of all operations and status changes</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border bg-muted/50 p-4 max-h-[300px] overflow-y-auto">
						{log.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">No activity yet. Create a charge to get started.</p>
						) : (
							<ul className="space-y-2 text-sm font-mono">
								{log.map((line, i) => (
									<li key={i} className={line.startsWith('✓') ? 'text-green-600 dark:text-green-400' : line.startsWith('✗') ? 'text-red-600 dark:text-red-400' : line.startsWith('🚀') || line.startsWith('📨') || line.startsWith('💸') ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-foreground'}>
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

/*********
Purpose: List refunds for quick demo to investors/admins with polished fintech UI.
Assumptions: Uses server-side fetch to call API route.
*********/

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import Link from 'next/link';

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

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'approved':
		case 'recouped':
			return 'success';
		case 'instant_sent':
		case 'posted':
			return 'default';
		case 'failed':
			return 'destructive';
		default:
			return 'secondary';
	}
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
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<CreditCard className="h-8 w-8" />
					Refunds
				</h1>
				<p className="text-muted-foreground mt-2">View and manage all refund records</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent Refunds</CardTitle>
					<CardDescription>Latest 25 refund records from your database</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Card</TableHead>
									<TableHead>Created</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{refunds.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="text-center text-muted-foreground py-8">
											No refunds found
										</TableCell>
									</TableRow>
								) : (
									refunds.map((r) => (
										<TableRow key={r.id} className="hover:bg-muted/50">
											<TableCell className="font-mono text-xs">
												<Link href={`/refunds/${r.id}`} className="hover:underline text-primary">
													{r.id.slice(0, 8)}…
												</Link>
											</TableCell>
											<TableCell className="font-medium">${(r.amount_cents / 100).toFixed(2)}</TableCell>
											<TableCell>
												<Badge variant={getStatusBadgeVariant(r.status)}>{r.status}</Badge>
											</TableCell>
											<TableCell>{r.card_last4 ? `•••• ${r.card_last4}` : <span className="text-muted-foreground">n/a</span>}</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{r.created_at ? new Date(r.created_at).toLocaleString() : ''}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

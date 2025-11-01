/*********
Purpose: Show refund details with computed fee and net payout, plus action buttons for demo/testing.
Assumptions: Calls API endpoints and uses a small client component for actions.
*********/

import ActionButtons from '@/components/ActionButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, DollarSign, Percent } from 'lucide-react';
import Link from 'next/link';

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

async function loadRefund(id: string): Promise<RefundDetail | null> {
	const res = await fetch(`${getBaseUrl()}/api/refunds/${id}`, { cache: 'no-store' });
	if (!res.ok) return null;
	const json = (await res.json()) as ApiResponse<RefundDetail>;
	return json.data ?? null;
}

export default async function RefundDetailPage({ params }: { params: { id: string } }) {
	const refund = await loadRefund(params.id);
	if (!refund) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Refund Not Found</CardTitle>
				</CardHeader>
				<CardContent>
					<Link href="/refunds">
						<Badge variant="outline" className="cursor-pointer hover:bg-accent">
							<ArrowLeft className="h-3 w-3 mr-1" />
							Back to Refunds
						</Badge>
					</Link>
				</CardContent>
			</Card>
		);
	}
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/refunds">
					<Badge variant="outline" className="cursor-pointer hover:bg-accent">
						<ArrowLeft className="h-3 w-3 mr-1" />
						Back
					</Badge>
				</Link>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Refund Details</h1>
					<p className="text-muted-foreground mt-1 font-mono text-sm">{refund.id}</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="h-5 w-5" />
							Transaction Info
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground">Status</span>
							<Badge variant={getStatusBadgeVariant(refund.status)}>{refund.status}</Badge>
						</div>
						<Separator />
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground">Card</span>
							<span className="text-sm font-mono">{refund.card_last4 ? `•••• ${refund.card_last4}` : 'n/a'}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground">Processor</span>
							<Badge variant="outline">{refund.processor}</Badge>
						</div>
						{refund.processor_refund_id && (
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-muted-foreground">Refund ID</span>
								<span className="text-xs font-mono text-muted-foreground">{refund.processor_refund_id.slice(0, 20)}…</span>
							</div>
						)}
						{refund.created_at && (
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-muted-foreground">Created</span>
								<span className="text-sm">{new Date(refund.created_at).toLocaleString()}</span>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="h-5 w-5" />
							Financial Details
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-muted-foreground">Refund Amount</span>
								<span className="text-xl font-bold">${(refund.amount_cents / 100).toFixed(2)}</span>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
									<Percent className="h-3 w-3" />
									Fee
								</span>
								<span className="text-lg font-semibold text-muted-foreground">${(refund.fee_cents / 100).toFixed(2)}</span>
							</div>
							<Separator />
							<div className="flex items-center justify-between pt-2">
								<span className="text-base font-semibold">Net Payout</span>
								<span className="text-2xl font-bold text-primary">${(refund.net_payout_cents / 100).toFixed(2)}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
					<CardDescription>Test the refund lifecycle with these actions</CardDescription>
				</CardHeader>
				<CardContent>
					<ActionButtons refundId={refund.id} status={refund.status} />
				</CardContent>
			</Card>
		</div>
	);
}

/*********
Purpose: Centralized shared types for Booma backend.
Assumptions: This is the single source of truth for domain types used across API routes and libs.
*********/

export type RefundStatus =
	| 'initiated'
	| 'approved'
	| 'instant_sent'
	| 'posted'
	| 'recouped';

// Back-compat alias for the single status model used elsewhere
export type Status = RefundStatus;

export interface ApiResponse<T> {
	ok: boolean;
	data?: T;
	error?: string;
}

export interface IdempotencyRecord {
	id: string;
	scope: string;
	key: string;
	status: 'in_progress' | 'completed' | 'failed';
	response_body: unknown | null;
	error_message: string | null;
	created_at: string;
	updated_at: string;
}

export interface RefundRecord {
	id: string;
	user_id: string;
	merchant_id?: string | null;
	processor: 'stripe';
	processor_refund_id?: string | null;
	original_charge_id?: string | null;
	amount_cents: number;
	card_last4?: string | null;
	status: RefundStatus;
	posted_at?: string | null;
	created_at?: string;
}

export interface BankAccount {
	id: string;
	user_id: string;
	provider: 'plaid';
	plaid_account_id: string;
	name_on_account?: string | null;
	routing_number_last4?: string | null;
	account_number_last4?: string | null;
	status: 'verified' | 'unverified' | 'disabled';
	created_at?: string;
}

export interface LedgerEntry {
	id: string;
	refund_id: string;
	type: 'advance' | 'fee' | 'repayment' | 'adjustment';
	amount_cents: number;
	currency: 'usd';
	meta?: Record<string, any>;
	created_at?: string;
}

export const REFUND_FEE_CAP_CENTS = 1000 as const;

export function calcFeeCents(amount_cents: number): number {
	return Math.min(100 + Math.floor(amount_cents * 0.03), REFUND_FEE_CAP_CENTS);
}

export interface TransferCreateRequest {
	amountCents: number;
	currency: 'USD';
	customerId: string;
	counterpartyId: string;
	direction: 'credit' | 'debit';
	metadata?: Record<string, string>;
	idempotencyKey?: string;
}

export interface TransferCreateResponse {
	transferId: string;
	status: Status;
}

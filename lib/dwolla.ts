/*********
Purpose: Minimal Dwolla sandbox client helpers for creating customers, funding sources, and transfers.
Assumptions: Uses Basic auth with DWOLLA_API_KEY and DWOLLA_API_SECRET. Sandbox base URL is used when DWOLLA_ENV !== 'production'.
*********/

function getBaseUrl(): string {
	const env = process.env.DWOLLA_ENV || 'sandbox';
	return env === 'production' ? 'https://api.dwolla.com' : 'https://api-sandbox.dwolla.com';
}

function getAuthHeader(): string {
	const key = process.env.DWOLLA_API_KEY || '';
	const secret = process.env.DWOLLA_API_SECRET || '';
	const token = Buffer.from(`${key}:${secret}`).toString('base64');
	return `Basic ${token}`;
}

export function getDwolla() {
	const baseUrl = getBaseUrl();
	const auth = getAuthHeader();
	return {
		baseUrl,
		async get(path: string) {
			const res = await fetch(`${baseUrl}${path}`, {
				headers: { Authorization: auth, Accept: 'application/vnd.dwolla.v1.hal+json' },
			});
			if (!res.ok) throw new Error(`Dwolla GET ${path} failed: ${res.status}`);
			return res.json();
		},
		async post(path: string, body: unknown, headers: Record<string, string> = {}) {
			const res = await fetch(`${baseUrl}${path}`, {
				method: 'POST',
				headers: {
					Authorization: auth,
					'Content-Type': 'application/json',
					Accept: 'application/vnd.dwolla.v1.hal+json',
					...headers,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`Dwolla POST ${path} failed: ${res.status} ${text}`);
			}
			return res;
		},
	};
}

export async function createCustomerIfMissing(user: { id: string; email: string }): Promise<string> {
	const dw = getDwolla();
	// Sandbox note: searching customers by email requires listing or a dedicated search. For minimal implementation, attempt creation and fallback if duplicate.
	try {
		const res = await dw.post('/customers', {
			firstName: 'Booma',
			lastName: user.id,
			email: user.email,
			type: 'receive-only',
		});
		const location = res.headers.get('location');
		if (!location) throw new Error('Dwolla customer location header missing');
		return location;
	} catch (e) {
		// If duplicate, attempt to find via listing recent customers as a placeholder. In real impl, store customerId mapped to user.
		// Returning a deterministic placeholder in dev to avoid blocking.
		if (process.env.NODE_ENV !== 'production') {
			return `urn:dwolla:customer:${user.id}`;
		}
		throw e;
	}
}

export async function createFundingSourceIfMissing(
	dwollaCustomerId: string,
	plaidTokenOrRtnAcct?: { routing: string; account: string }
): Promise<string> {
	const dw = getDwolla();
	if (!plaidTokenOrRtnAcct) {
		// In dev, return a placeholder; in prod, require real token or routing/account.
		if (process.env.NODE_ENV !== 'production') {
			return `urn:dwolla:funding-source:${dwollaCustomerId}:demo`;
		}
		throw new Error('Missing funding source credentials');
	}
	// Minimal ACH funding source creation with routing/account for sandbox
	const body = {
		accountNumber: plaidTokenOrRtnAcct.account,
		routingNumber: plaidTokenOrRtnAcct.routing,
		type: 'checking',
		name: 'Booma User Account',
	};
	const res = await dw.post(`/customers/${encodeURIComponent(dwollaCustomerId)}/funding-sources`, body);
	const location = res.headers.get('location');
	if (!location) throw new Error('Dwolla funding source location header missing');
	return location;
}

export async function initiateTransfer(params: {
	sourceFundingSource: string;
	destFundingSource: string;
	amountCents: number;
	idempotencyKey: string;
}): Promise<{ transferId: string }> {
	const dw = getDwolla();
	const idempotencyHeader = { 'Idempotency-Key': params.idempotencyKey };
	const body = {
		_links: {
			source: { href: params.sourceFundingSource },
			destination: { href: params.destFundingSource },
		},
		amount: { currency: 'USD', value: (params.amountCents / 100).toFixed(2) },
	};
	const res = await dw.post('/transfers', body, idempotencyHeader);
	const location = res.headers.get('location');
	if (!location) throw new Error('Dwolla transfer location header missing');
	return { transferId: location };
}

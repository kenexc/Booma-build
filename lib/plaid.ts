/*********
Purpose: Minimal Plaid API client wrapper for sandbox operations.
Assumptions: Uses PLAID_CLIENT_ID and PLAID_SECRET from env. Base URL is sandbox.plaid.com when PLAID_ENV=sandbox.
*********/

function getBaseUrl(): string {
	const env = process.env.PLAID_ENV || 'sandbox';
	return `https://${env}.plaid.com`;
}

function getHeaders() {
	return {
		'Content-Type': 'application/json',
		'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
		'PLAID-SECRET': process.env.PLAID_SECRET || '',
	};
}

export async function plaidPost(endpoint: string, body: unknown) {
	const url = `${getBaseUrl()}${endpoint}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Plaid API error: ${res.status} ${text}`);
	}
	return res.json();
}


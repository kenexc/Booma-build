/*********
Purpose: Money utilities in cents and dollars.
Assumptions: Cents are whole integers. Rounds to nearest cent when converting from dollars.
*********/

export { calcFeeCents } from './types';

export function cents(n: number): number {
	return Math.round(n * 100);
}

export function dollars(nCents: number): number {
	return nCents / 100;
}

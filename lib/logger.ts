/*********
Purpose: Thin logging wrappers with consistent prefix for server logs.
Assumptions: Uses console methods; no external logging infra.
*********/

const PREFIX = '[Booma]';

export function logInfo(message: string, meta?: unknown) {
	if (meta !== undefined) {
		console.info(`${PREFIX} info: ${message}`, meta);
	} else {
		console.info(`${PREFIX} info: ${message}`);
	}
}

export function logWarn(message: string, meta?: unknown) {
	if (meta !== undefined) {
		console.warn(`${PREFIX} warn: ${message}`, meta);
	} else {
		console.warn(`${PREFIX} warn: ${message}`);
	}
}

export function logError(message: string, meta?: unknown) {
	if (meta !== undefined) {
		console.error(`${PREFIX} error: ${message}`, meta);
	} else {
		console.error(`${PREFIX} error: ${message}`);
	}
}

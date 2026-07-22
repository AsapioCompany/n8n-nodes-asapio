import { createHmac, timingSafeEqual } from 'crypto';

export function extractHexSignature(headerValue: string | undefined): string | undefined {
	if (!headerValue) return undefined;
	const [prefix, hex] = headerValue.split('=');
	return prefix === 'sha256' ? hex : undefined;
}

export function computeSignature(secret: string, rawBody: Buffer): string {
	return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function safeCompare(a: string | undefined, b: string): boolean {
	if (!a) return false;
	if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
	const aBuf = Buffer.from(a, 'hex');
	const bBuf = Buffer.from(b, 'hex');
	return timingSafeEqual(aBuf, bBuf);
}

export function isTimestampFresh(
	receivedTimestamp: string | undefined,
	toleranceSeconds: number,
	nowSeconds: number = Math.floor(Date.now() / 1000),
): { valid: boolean; ageSeconds?: number } {
	if (!receivedTimestamp || !/^\d+$/.test(receivedTimestamp)) {
		return { valid: false };
	}
	const ageSeconds = Math.abs(nowSeconds - parseInt(receivedTimestamp, 10));
	return { valid: ageSeconds <= toleranceSeconds, ageSeconds };
}

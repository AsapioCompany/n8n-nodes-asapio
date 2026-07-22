import {
	computeSignature,
	extractHexSignature,
	isTimestampFresh,
	safeCompare,
} from './signature';

describe('extractHexSignature', () => {
	it('extracts the hex digest from a "sha256=<hex>" header', () => {
		expect(extractHexSignature('sha256=abcdef0123')).toBe('abcdef0123');
	});

	it('returns undefined for an unsupported prefix', () => {
		expect(extractHexSignature('sha1=abcdef0123')).toBeUndefined();
	});

	it('returns undefined when the header is missing', () => {
		expect(extractHexSignature(undefined)).toBeUndefined();
	});
});

describe('computeSignature', () => {
	it('computes a deterministic HMAC-SHA256 hex digest', () => {
		const body = Buffer.from('{"event":"test"}');
		const signature = computeSignature('my-secret', body);

		expect(signature).toBe(computeSignature('my-secret', body));
		expect(signature).toMatch(/^[0-9a-f]{64}$/);
	});

	it('produces a different signature for a different secret', () => {
		const body = Buffer.from('{"event":"test"}');
		expect(computeSignature('secret-a', body)).not.toBe(computeSignature('secret-b', body));
	});

	it('produces a different signature for a different body', () => {
		const secret = 'my-secret';
		expect(computeSignature(secret, Buffer.from('a'))).not.toBe(
			computeSignature(secret, Buffer.from('b')),
		);
	});
});

describe('safeCompare', () => {
	it('returns true for matching signatures', () => {
		const body = Buffer.from('payload');
		const expected = computeSignature('secret', body);
		expect(safeCompare(expected, expected)).toBe(true);
	});

	it('returns false for a tampered signature of equal length', () => {
		const expected = computeSignature('secret', Buffer.from('payload'));
		const tampered = '0'.repeat(expected.length);
		expect(safeCompare(tampered === expected ? 'f'.repeat(expected.length) : tampered, expected)).toBe(
			false,
		);
	});

	it('returns false when the received value has a different length', () => {
		expect(safeCompare('abcd', 'abcdef')).toBe(false);
	});

	it('returns false when the received value is undefined', () => {
		expect(safeCompare(undefined, computeSignature('secret', Buffer.from('x')))).toBe(false);
	});

	it('returns false for non-hex input instead of throwing', () => {
		expect(safeCompare('not-hex-!!', 'abcdef')).toBe(false);
	});
});

describe('isTimestampFresh', () => {
	const now = 1_700_000_000;

	it('accepts a timestamp within tolerance', () => {
		const result = isTimestampFresh(String(now - 10), 300, now);
		expect(result.valid).toBe(true);
		expect(result.ageSeconds).toBe(10);
	});

	it('rejects a timestamp older than the tolerance window (replay protection)', () => {
		const result = isTimestampFresh(String(now - 301), 300, now);
		expect(result.valid).toBe(false);
		expect(result.ageSeconds).toBe(301);
	});

	it('rejects a timestamp from the future beyond tolerance', () => {
		const result = isTimestampFresh(String(now + 301), 300, now);
		expect(result.valid).toBe(false);
	});

	it('rejects a missing timestamp', () => {
		expect(isTimestampFresh(undefined, 300, now).valid).toBe(false);
	});

	it('rejects a non-numeric timestamp instead of throwing', () => {
		expect(isTimestampFresh('not-a-number', 300, now).valid).toBe(false);
	});
});

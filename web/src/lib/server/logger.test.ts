import { describe, it, expect } from 'vitest';
import { createLogger } from './logger';
import type { Clock } from '$lib/domain/clock';

const fixedClock = (iso: string): Clock => ({ now: () => new Date(iso) });

function capturingLogger(clock: Clock) {
	const lines: string[] = [];
	const logger = createLogger({ clock, write: (line) => lines.push(line) });
	return { logger, parsed: () => lines.map((l) => JSON.parse(l)) };
}

describe('createLogger', () => {
	it('emits one JSON line with timestamp, level, message and context', () => {
		const { logger, parsed } = capturingLogger(fixedClock('2026-08-01T10:00:00.000Z'));
		logger.warn('CMS navigation unavailable', { operation: 'getNavigation', error: 'timeout' });

		expect(parsed()).toEqual([
			{
				timestamp: '2026-08-01T10:00:00.000Z',
				level: 'warn',
				message: 'CMS navigation unavailable',
				operation: 'getNavigation',
				error: 'timeout'
			}
		]);
	});

	it('labels each level', () => {
		const { logger, parsed } = capturingLogger(fixedClock('2026-08-01T10:00:00.000Z'));
		logger.info('a');
		logger.warn('b');
		logger.error('c');
		expect(parsed().map((l) => l.level)).toEqual(['info', 'warn', 'error']);
	});

	it('child() merges base context (e.g. requestId, userId) into every line', () => {
		const { logger, parsed } = capturingLogger(fixedClock('2026-08-01T10:00:00.000Z'));
		const reqLog = logger.child({ requestId: 'req-1' }).child({ userId: 'medlem' });
		reqLog.error('boom', { operation: 'claimDuty' });

		expect(parsed()[0]).toMatchObject({
			requestId: 'req-1',
			userId: 'medlem',
			operation: 'claimDuty',
			message: 'boom'
		});
	});
});

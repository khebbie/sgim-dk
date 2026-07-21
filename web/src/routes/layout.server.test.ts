import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '$lib/server/logger';
import type { Clock } from '$lib/domain/clock';

// Mock the app wiring so the load runs without env/config or a live CMS.
// getNavigation fails -> the load must fall back AND log a structured warning.
vi.mock('$lib/server/content', () => ({
	contentSource: () => ({
		getNavigation: () => Promise.resolve({ ok: false, error: { kind: 'timeout' } }),
		getSiteSettings: () => Promise.resolve({ ok: true, value: { siteName: 'X', intro: '' } })
	})
}));

import { load } from './+layout.server';

describe('layout load logging', () => {
	it('logs a structured warning (with the injected clock) when navigation falls back', async () => {
		const clock: Clock = { now: () => new Date('2026-08-01T09:00:00.000Z') };
		const lines: string[] = [];
		const log = createLogger({ clock, base: { requestId: 'req-9' }, write: (l) => lines.push(l) });

		const result = (await load({
			fetch: (() => {}) as unknown,
			locals: { log, requestId: 'req-9' }
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)) as { navigation: unknown[] };

		// Fallback menu is returned, never a crash.
		expect(result.navigation.length).toBeGreaterThan(0);

		const warn = lines.map((l) => JSON.parse(l)).find((l) => l.operation === 'getNavigation');
		expect(warn).toMatchObject({
			timestamp: '2026-08-01T09:00:00.000Z',
			level: 'warn',
			requestId: 'req-9',
			error: 'timeout'
		});
	});
});

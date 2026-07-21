import { describe, it, expect } from 'vitest';
import { createLogger } from './logger';

function capturing(iso: string) {
  const lines: string[] = [];
  const logger = createLogger({ now: () => new Date(iso), write: (l) => lines.push(l) });
  return { logger, parsed: () => lines.map((l) => JSON.parse(l)) };
}

describe('createLogger', () => {
  it('emits JSON with timestamp, level, message and context (fake clock)', () => {
    const { logger, parsed } = capturing('2026-08-01T10:00:00.000Z');
    logger.warn('CMS navigation unavailable', { operation: 'getNavigation', error: 'timeout' });

    expect(parsed()).toEqual([
      {
        timestamp: '2026-08-01T10:00:00.000Z',
        level: 'warn',
        message: 'CMS navigation unavailable',
        operation: 'getNavigation',
        error: 'timeout',
      },
    ]);
  });

  it('labels each level', () => {
    const { logger, parsed } = capturing('2026-08-01T10:00:00.000Z');
    logger.info('a');
    logger.warn('b');
    logger.error('c');
    expect(parsed().map((l) => l.level)).toEqual(['info', 'warn', 'error']);
  });

  it('child() binds base context (requestId, userId) into every line', () => {
    const { logger, parsed } = capturing('2026-08-01T10:00:00.000Z');
    logger.child({ requestId: 'req-1' }).child({ userId: 7 }).error('boom', { operation: 'claim' });

    expect(parsed()[0]).toMatchObject({
      requestId: 'req-1',
      userId: 7,
      operation: 'claim',
      message: 'boom',
    });
  });
});

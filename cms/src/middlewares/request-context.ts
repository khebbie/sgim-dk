/**
 * Request-context middleware (sgim-pgx.2). Assigns a requestId per request,
 * binds a request-scoped structured logger onto ctx.state, records a Prometheus
 * request metric, and logs errors / non-2xx responses (never routine successes).
 */
import { randomUUID } from 'node:crypto';
import { createLogger } from '../utils/logger';
import { recordHttpRequest } from '../utils/metrics';

 
export default (_config: unknown, _deps: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (ctx: any, next: () => Promise<void>) => {
    const requestId = randomUUID();
    ctx.state.requestId = requestId;
    const log = createLogger({ base: { requestId } });
    ctx.state.log = log;

    try {
      await next();
    } catch (error) {
      log.error('request threw', {
        operation: 'http',
        method: ctx.method,
        path: ctx.path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      recordHttpRequest(ctx.method, ctx.status ?? 0);
      if (typeof ctx.status === 'number' && ctx.status >= 400) {
        log.warn('request completed with error status', {
          operation: 'http',
          method: ctx.method,
          path: ctx.path,
          status: ctx.status,
        });
      }
    }
  };
};

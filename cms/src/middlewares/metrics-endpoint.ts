/**
 * Serves Prometheus metrics at the bare `/metrics` path (sgim-pgx.2). A custom
 * api route would be prefixed with /api; a middleware serves the conventional
 * path directly. Public and read-only (aggregate counters, no content).
 */
import { metricsText, metricsContentType } from '../utils/metrics';

export default (_config: unknown, _deps: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.method === 'GET' && ctx.path === '/metrics') {
      ctx.set('Content-Type', metricsContentType);
      ctx.body = await metricsText();
      return;
    }
    await next();
  };
};

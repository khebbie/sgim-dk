/**
 * Prometheus metrics for the CMS (sgim-pgx.2). Exposes default process metrics
 * plus an HTTP request counter, independent of any infrastructure specifics.
 * The request-context middleware records requests; the /metrics endpoint
 * (api/metrics) serves the registry.
 */
import client from 'prom-client';

const register = new client.Registry();

// Guard against double-registration under dev reloads.
if (!register.getSingleMetric('process_cpu_user_seconds_total')) {
  client.collectDefaultMetrics({ register });
}

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled by the CMS, by method and status.',
  labelNames: ['method', 'status'],
  registers: [register],
});

export function recordHttpRequest(method: string, status: number): void {
  httpRequestsTotal.inc({ method, status: String(status) });
}

export function metricsText(): Promise<string> {
  return register.metrics();
}

export const metricsContentType = register.contentType;

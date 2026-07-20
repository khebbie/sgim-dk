/**
 * Composes the resilience policy for CMS calls from a community library
 * (cockatiel) rather than hand-rolling — constitution: "Use community built
 * libraries for these patterns". Wraps: retry(outer) → circuit-breaker →
 * timeout(inner). Each attempt gets its own timeout; the breaker trips after
 * repeated failures; retries cover 5xx/timeouts/network but never 4xx.
 */
import {
	wrap,
	retry,
	circuitBreaker,
	timeout,
	handleAll,
	handleType,
	ConstantBackoff,
	ConsecutiveBreaker,
	TimeoutStrategy,
	TaskCancelledError,
	type IPolicy
} from 'cockatiel';
import { HttpServerError } from './errors';

export interface ResilienceOptions {
	/** Per-attempt timeout for the external CMS call (~5s per constitution). */
	timeoutMs: number;
	/** Retry attempts after the first try (default 2). */
	maxRetries?: number;
	/** Delay between retries in ms (default 200; set 0 in tests). */
	retryDelayMs?: number;
	/** Consecutive failures before the breaker opens (default 5). */
	breakerThreshold?: number;
	/** How long the breaker stays open before a trial call (default 10s). */
	breakerHalfOpenAfterMs?: number;
}

export function buildCmsPolicy(options: ResilienceOptions): IPolicy {
	const retryPolicy = retry(
		handleType(HttpServerError).orType(TaskCancelledError).orType(TypeError),
		{
			maxAttempts: options.maxRetries ?? 2,
			backoff: new ConstantBackoff(options.retryDelayMs ?? 200)
		}
	);
	const breaker = circuitBreaker(handleAll, {
		halfOpenAfter: options.breakerHalfOpenAfterMs ?? 10_000,
		breaker: new ConsecutiveBreaker(options.breakerThreshold ?? 5)
	});
	const timeoutPolicy = timeout(options.timeoutMs, TimeoutStrategy.Aggressive);
	return wrap(retryPolicy, breaker, timeoutPolicy);
}

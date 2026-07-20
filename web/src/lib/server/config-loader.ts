/**
 * Pure config validation logic. No I/O here — the caller supplies the raw
 * environment source, so this stays a plain function that unit tests can
 * exercise with a fake object (see config-loader.test.ts).
 */

export interface Config {
	/** Base URL of the Strapi CMS API, e.g. "http://localhost:1337". */
	cmsBaseUrl: string;
	/** Timeout (ms) for outbound requests to the CMS — external call, ~5s per constitution. */
	cmsRequestTimeoutMs: number;
	/** Secret used to sign/encrypt member session cookies. */
	sessionSecret: string;
}

export type EnvSource = Record<string, string | undefined>;

const DEFAULT_CMS_TIMEOUT_MS = 5000;

function requireString(source: EnvSource, name: string): string {
	const value = source[name]?.trim();
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
	}
	return value;
}

function readTimeoutMs(source: EnvSource, name: string, fallback: number): number {
	const raw = source[name]?.trim();
	if (!raw) return fallback;
	return parsePositiveNumber(name, raw);
}

function parsePositiveNumber(name: string, raw: string): number {
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`Invalid ${name}: expected a positive number in ms, got "${raw}".`);
	}
	return parsed;
}

/** Builds a validated Config, failing fast with a clear message on bad input. */
export function loadConfig(source: EnvSource): Config {
	return {
		cmsBaseUrl: requireString(source, 'CMS_BASE_URL'),
		cmsRequestTimeoutMs: readTimeoutMs(source, 'CMS_REQUEST_TIMEOUT_MS', DEFAULT_CMS_TIMEOUT_MS),
		sessionSecret: requireString(source, 'SESSION_SECRET')
	};
}

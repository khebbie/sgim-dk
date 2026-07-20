/**
 * Server-only Config accessor. SvelteKit refuses to bundle anything under
 * `$lib/server` into client code, so this is the one place `$env` is read —
 * every other module receives Config explicitly instead of reading env itself.
 *
 * Validation is LAZY + memoised: merely importing this module (which happens
 * across the build graph) must NOT require env vars, since those only exist at
 * runtime. `hooks.server.ts` calls getConfig() from the server `init` hook to
 * fail fast at startup; request-time code calls it per request.
 */
import { env } from '$env/dynamic/private';
import { loadConfig, type Config } from './config-loader';

let cached: Config | undefined;

export function getConfig(): Config {
	return (cached ??= loadConfig(env));
}

export type { Config };

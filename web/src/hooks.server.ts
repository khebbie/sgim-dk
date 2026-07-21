import type { Handle, ServerInit } from '@sveltejs/kit';
import { getConfig } from './lib/server/config';
import { fetchMember } from './lib/server/auth';
import { createLogger } from './lib/server/logger';
import { systemRandom } from './lib/domain/random';

// Fail fast at server startup (runtime) if a required env var is missing/invalid,
// rather than on the first request that needs it. Runs once when the server
// boots — not during the build, where env vars are intentionally absent.
export const init: ServerInit = () => {
	getConfig();
};

// Populate the current member from the session cookie (if any) so loads/actions
// can read event.locals.member and protect the members-only area.
export const handle: Handle = async ({ event, resolve }) => {
	// Per-request correlation id + a request-scoped structured logger (sgim-x60.2).
	const requestId = systemRandom.uuid();
	event.locals.requestId = requestId;
	event.locals.log = createLogger({ base: { requestId } });

	// Permanent redirect for legacy /home.aspx URL (sgim-x60.16)
	if (event.url.pathname === '/home.aspx') {
		return new Response(null, {
			status: 301,
			headers: { location: '/' }
		});
	}

	const jwt = event.cookies.get('session');
	if (jwt) {
		const member = await fetchMember(event.fetch, jwt);
		if (member) {
			event.locals.member = member;
			// Bind the userId for the rest of the request; don't log routine reads.
			event.locals.log = event.locals.log.child({ userId: member.username });
		} else {
			// A session cookie that no longer resolves is a notable auth transition.
			event.locals.log.warn('session cookie did not resolve to a member', { operation: 'auth' });
		}
	}
	return resolve(event);
};

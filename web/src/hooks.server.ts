import type { Handle, ServerInit } from '@sveltejs/kit';
import { getConfig } from './lib/server/config';
import { fetchMember } from './lib/server/auth';

// Fail fast at server startup (runtime) if a required env var is missing/invalid,
// rather than on the first request that needs it. Runs once when the server
// boots — not during the build, where env vars are intentionally absent.
export const init: ServerInit = () => {
	getConfig();
};

// Populate the current member from the session cookie (if any) so loads/actions
// can read event.locals.member and protect the members-only area.
export const handle: Handle = async ({ event, resolve }) => {
	const jwt = event.cookies.get('session');
	if (jwt) {
		const member = await fetchMember(event.fetch, jwt);
		if (member) event.locals.member = member;
	}
	return resolve(event);
};

/**
 * Server-only authentication against Strapi Users & Permissions. Members log in
 * with email + password (POST /api/auth/local) and receive a JWT which the app
 * stores in an httpOnly session cookie. This module never touches cookies — the
 * route actions / hooks own the session; here we only talk to the CMS.
 */
import { ok, err, type Result } from '$lib/domain/result';
import type { FetchFn } from '$lib/server/cms/http';
import { getConfig } from '$lib/server/config';

export interface Member {
	id: number;
	username: string;
	email: string;
}

export type AuthError = { kind: 'invalid_credentials' } | { kind: 'unavailable' };

interface StrapiUser {
	id: number;
	username: string;
	email: string;
}

const toMember = (user: StrapiUser): Member => ({
	id: user.id,
	username: user.username,
	email: user.email
});

export async function login(
	fetch: FetchFn,
	identifier: string,
	password: string
): Promise<Result<{ jwt: string; member: Member }, AuthError>> {
	const { cmsBaseUrl } = getConfig();
	try {
		const response = await fetch(`${cmsBaseUrl}/api/auth/local`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ identifier, password })
		});
		if (response.ok) {
			const data = (await response.json()) as { jwt: string; user: StrapiUser };
			return ok({ jwt: data.jwt, member: toMember(data.user) });
		}
		return err(response.status >= 500 ? { kind: 'unavailable' } : { kind: 'invalid_credentials' });
	} catch {
		return err({ kind: 'unavailable' });
	}
}

/** Resolves the member for a session JWT, or null if it is invalid/expired. */
export async function fetchMember(fetch: FetchFn, jwt: string): Promise<Member | null> {
	const { cmsBaseUrl } = getConfig();
	try {
		const response = await fetch(`${cmsBaseUrl}/api/users/me`, {
			headers: { Authorization: `Bearer ${jwt}` }
		});
		if (!response.ok) return null;
		return toMember((await response.json()) as StrapiUser);
	} catch {
		return null;
	}
}

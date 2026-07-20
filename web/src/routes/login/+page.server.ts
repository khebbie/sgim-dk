import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { login } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.member) redirect(303, '/members');
};

export const actions: Actions = {
	default: async ({ request, cookies, fetch, url }) => {
		const form = await request.formData();
		const identifier = String(form.get('identifier') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (!identifier || !password) {
			return fail(400, { identifier, error: 'Udfyld både email og adgangskode.' });
		}

		const result = await login(fetch, identifier, password);
		if (!isOk(result)) {
			const unavailable = result.error.kind === 'unavailable';
			return fail(unavailable ? 502 : 401, {
				identifier,
				error: unavailable
					? 'Login er midlertidigt utilgængeligt. Prøv igen senere.'
					: 'Forkert email eller adgangskode.'
			});
		}

		cookies.set('session', result.value.jwt, {
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 7
		});
		redirect(303, '/members');
	}
};

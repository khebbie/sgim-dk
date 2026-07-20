/**
 * Guards the members-only area: anonymous visitors are redirected to /login.
 * Exposes the current member to child pages.
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.member) redirect(303, '/login');
	return { member: locals.member };
};

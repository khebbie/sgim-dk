import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { buildRosterFromMeetings, summarizeYearlyDuties } from '$lib/domain/duty';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('session');
	if (!token) return { roster: [], yearlyDuties: [] };
	const [rosterResult, eventsResult] = await Promise.all([
		contentSource(fetch).getDutyRoster(token),
		contentSource(fetch).listUpcomingEvents()
	]);
	const rosterRows = isOk(rosterResult) ? rosterResult.value : [];
	const upcomingEvents = isOk(eventsResult) ? eventsResult.value : [];
	const roster = buildRosterFromMeetings(
		upcomingEvents.map((event) => ({
			eventSlug: event.slug,
			eventTitle: event.title,
			start: event.kind === 'single' ? event.start : event.startDate,
			kind: event.kind
		})),
		rosterRows
	);
	const currentYear = new Date().getFullYear();
	return {
		roster,
		yearlyDuties: summarizeYearlyDuties(roster, currentYear)
	};
};

const isConflict = (error: { kind: string; status?: number }) =>
	error.kind === 'client' && error.status === 409;

export const actions: Actions = {
	claim: async ({ request, cookies, fetch }) => {
		const token = cookies.get('session');
		if (!token) redirect(303, '/login');
		const id = String((await request.formData()).get('id') ?? '');
		const result = await contentSource(fetch).claimDuty(id, token);
		if (!isOk(result)) {
			return isConflict(result.error)
				? fail(409, { error: 'Tjansen er allerede taget.' })
				: fail(400, { error: 'Kunne ikke tage tjansen.' });
		}
		return { done: true };
	},

	release: async ({ request, cookies, fetch }) => {
		const token = cookies.get('session');
		if (!token) redirect(303, '/login');
		const id = String((await request.formData()).get('id') ?? '');
		const result = await contentSource(fetch).releaseDuty(id, token);
		if (!isOk(result)) return fail(400, { error: 'Kunne ikke frigive tjansen.' });
		return { done: true };
	},

	logout: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		redirect(303, '/');
	}
};

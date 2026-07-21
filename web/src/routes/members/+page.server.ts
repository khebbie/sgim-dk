import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { buildDutyGrid, summarizeYearlyDuties } from '$lib/domain/duty';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
	const token = cookies.get('session');
	if (!token) return { roster: [], yearlyDuties: [] };
	const cms = contentSource(fetch);
	const [assignmentsResult, categoriesResult, eventsResult] = await Promise.all([
		cms.getDutyRoster(token),
		cms.getDutyCategories(),
		cms.listUpcomingEvents()
	]);
	const assignments = isOk(assignmentsResult) ? assignmentsResult.value : [];
	const categories = isOk(categoriesResult) ? categoriesResult.value : [];
	const upcomingEvents = isOk(eventsResult) ? eventsResult.value : [];

	// Roster grid = every upcoming (single-day) event × category, assignments
	// overlaid. Yearly counts come from the stored assignments (incl. past ones).
	const roster = buildDutyGrid(
		upcomingEvents.map((event) => ({
			eventId: event.id,
			eventSlug: event.slug,
			eventTitle: event.title,
			start: event.kind === 'single' ? event.start : event.startDate,
			kind: event.kind
		})),
		categories,
		assignments
	);
	const currentYear = new Date().getFullYear();
	return {
		roster,
		yearlyDuties: summarizeYearlyDuties(assignments, currentYear)
	};
};

const isConflict = (error: { kind: string; status?: number }) =>
	error.kind === 'client' && error.status === 409;

export const actions: Actions = {
	claim: async ({ request, cookies, fetch }) => {
		const token = cookies.get('session');
		if (!token) redirect(303, '/login');
		const form = await request.formData();
		const event = String(form.get('event') ?? '');
		const category = String(form.get('category') ?? '');
		const assignee = String(form.get('assignee') ?? '').trim();
		if (!event || !category || !assignee) {
			return fail(400, { error: 'Skriv et navn for at tildele tjansen.' });
		}
		const result = await contentSource(fetch).claimDuty(event, category, assignee, token);
		if (!isOk(result)) {
			return isConflict(result.error)
				? fail(409, { error: 'Tjansen er allerede taget.' })
				: fail(400, { error: 'Kunne ikke tildele tjansen.' });
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

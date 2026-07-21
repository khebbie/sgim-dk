/**
 * Calendar page (sgim-x60.15): shows a whole year's events grouped by month,
 * with year navigation across all years that have events (like sgim.dk).
 * The year comes from ?year=; defaults to the newest year with events.
 */
import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { groupByMonth } from '$lib/domain/calendar';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const cms = contentSource(fetch);
	const yearsResult = await cms.getEventYears();
	const years = isOk(yearsResult) ? yearsResult.value : [];

	const requested = Number(url.searchParams.get('year'));
	const year = years.includes(requested) ? requested : years[0];
	if (year === undefined) return { year: null, years, months: [] };

	const eventsResult = await cms.listEventsByYear(year);
	return { year, years, months: isOk(eventsResult) ? groupByMonth(eventsResult.value) : [] };
};

import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';

export const load: PageServerLoad = async ({ fetch }) => {
	const result = await contentSource(fetch).listUpcomingEvents();
	return { events: isOk(result) ? result.value : [] };
};

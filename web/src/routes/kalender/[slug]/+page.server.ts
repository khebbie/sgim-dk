import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { sanitizeRichText } from '$lib/server/sanitize';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const result = await contentSource(fetch).getEvent(params.slug);
	if (!isOk(result)) {
		if (result.error.kind === 'not_found') error(404, 'Arrangement ikke fundet');
		error(502, 'Kunne ikke hente arrangementet');
	}
	const event = result.value;
	return { event: { ...event, descriptionHtml: sanitizeRichText(event.descriptionHtml) } };
};

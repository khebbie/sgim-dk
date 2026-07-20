import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { sanitizeRichText } from '$lib/server/sanitize';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const result = await contentSource(fetch).getClub(params.slug);
	if (!isOk(result)) {
		if (result.error.kind === 'not_found') error(404, 'Klub ikke fundet');
		error(502, 'Kunne ikke hente klubben');
	}
	const club = result.value;
	return { club: { ...club, descriptionHtml: sanitizeRichText(club.descriptionHtml) } };
};

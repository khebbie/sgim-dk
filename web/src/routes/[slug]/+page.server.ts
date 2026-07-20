import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { sanitizeRichText } from '$lib/server/sanitize';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const result = await contentSource(fetch).getStaticPageBySlug(params.slug);
	if (!isOk(result)) {
		if (result.error.kind === 'not_found') error(404, 'Siden blev ikke fundet');
		error(502, 'Kunne ikke hente siden');
	}
	const page = result.value;
	return { page: { ...page, bodyHtml: sanitizeRichText(page.bodyHtml) } };
};

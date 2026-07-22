/**
 * XML sitemap (sgim-0lt.12). Lists the stable pages plus everything the CMS
 * knows about, so the new URLs are discovered quickly after the cutover —
 * particularly the ones replacing indexed .aspx pages.
 *
 * URLs are absolute and use the canonical host, matching the canonical tag.
 */
import type { RequestHandler } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';

const CANONICAL_ORIGIN = 'https://sgim.dk';

export const GET: RequestHandler = async ({ fetch, locals }) => {
	const cms = contentSource(fetch);
	const [clubsResult, eventsResult] = await Promise.all([
		cms.listClubs(),
		cms.listUpcomingEvents()
	]);

	if (!isOk(clubsResult) || !isOk(eventsResult)) {
		locals.log.warn('sitemap built without some CMS content', { operation: 'sitemap' });
	}

	const paths = [
		'/',
		'/kalender',
		'/klubber',
		'/om-os',
		...(isOk(clubsResult) ? clubsResult.value.map((c) => `/klubber/${c.slug}`) : []),
		...(isOk(eventsResult) ? eventsResult.value.map((e) => `/kalender/${e.slug}`) : [])
	];

	const body =
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
		[...new Set(paths)].map((p) => `  <url><loc>${CANONICAL_ORIGIN}${p}</loc></url>`).join('\n') +
		`\n</urlset>\n`;

	return new Response(body, {
		headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }
	});
};

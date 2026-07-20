/**
 * Loads the CMS-driven main navigation and site settings (for the footer) for
 * every page. Degrades gracefully: on any CMS failure it logs a structured
 * warning and falls back (fallback menu / null settings) so an outage never
 * crashes the site.
 */
import type { LayoutServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { chooseNavigation } from '$lib/domain/navigation';

export const load: LayoutServerLoad = async ({ fetch, locals }) => {
	const cms = contentSource(fetch);
	const [navResult, settingsResult] = await Promise.all([
		cms.getNavigation(),
		cms.getSiteSettings()
	]);

	const { navigation, usedFallback } = chooseNavigation(navResult);
	if (usedFallback) {
		const error = navResult.ok ? 'empty' : navResult.error.kind;
		console.warn(
			JSON.stringify({
				level: 'warn',
				operation: 'getNavigation',
				error,
				message: 'CMS navigation unavailable; using fallback menu'
			})
		);
	}

	return {
		navigation,
		siteSettings: isOk(settingsResult) ? settingsResult.value : null,
		member: locals.member ?? null
	};
};

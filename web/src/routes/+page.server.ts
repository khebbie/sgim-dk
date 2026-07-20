/**
 * Homepage data: active Aktuelt (for the takeover), upcoming events, and the
 * site intro. Every CMS call degrades independently — a failure yields the
 * default homepage with whatever loaded, never a crash. The takeover-vs-default
 * decision is the pure selectHomeView().
 */
import type { PageServerLoad } from './$types';
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { selectHomeView, type HomeView } from '$lib/domain/home';
import { sanitizeRichText } from '$lib/server/sanitize';

export const load: PageServerLoad = async ({ fetch }) => {
	const cms = contentSource(fetch);
	const [aktueltResult, eventsResult, settingsResult] = await Promise.all([
		cms.getActiveAktuelt(),
		cms.listUpcomingEvents(),
		cms.getSiteSettings()
	]);

	return {
		view: sanitizeView(selectHomeView(isOk(aktueltResult) ? aktueltResult.value : [])),
		upcomingEvents: isOk(eventsResult) ? eventsResult.value : [],
		intro: isOk(settingsResult) ? sanitizeRichText(settingsResult.value.intro) : null
	};
};

/** Sanitises CMS rich text carried by the takeover view before it is rendered. */
function sanitizeView(view: HomeView): HomeView {
	if (view.mode === 'default') return view;
	return {
		mode: 'takeover',
		aktuelt: { ...view.aktuelt, bodyHtml: sanitizeRichText(view.aktuelt.bodyHtml) }
	};
}

/**
 * ICS calendar feed endpoint for single-day events (sgim-pgx.16).
 *
 * GET /api/v1/events/ics - Returns an ICS file with all single-day events.
 * The CMS should only be used by the website and admin users, so this
 * endpoint is provided by the website, which fetches from the CMS and
 * generates the ICS feed.
 */
import { isOk } from '$lib/domain/result';
import { contentSource } from '$lib/server/content';
import { generateIcsCalendar } from '$lib/server/ics';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
	try {
		const cms = contentSource(fetch);
		const result = await cms.listSingleDayEvents();

		if (!isOk(result)) {
			// Log error but return empty calendar on failure for graceful degradation
			console.error(
				JSON.stringify({
					level: 'error',
					operation: 'listSingleDayEvents',
					error: result.error.kind,
					message: 'Failed to fetch single-day events for ICS feed'
				})
			);
			// Return empty calendar
			return new Response(generateIcsCalendar([]), {
				headers: {
					'Content-Type': 'text/calendar; charset=utf-8',
					'Cache-Control': 'no-cache'
				}
			});
		}

		// Generate ICS feed
		const icsContent = generateIcsCalendar(result.value);

		// Set proper cache headers for calendar clients
		// Cache for 1 hour to avoid regenerating on every request
		return new Response(icsContent, {
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error(
			JSON.stringify({
				level: 'error',
				operation: 'ics-endpoint',
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				message: 'Unhandled error in ICS endpoint'
			})
		);
		// Return empty calendar on any error
		return new Response(generateIcsCalendar([]), {
			status: 500,
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Cache-Control': 'no-cache'
			}
		});
	}
};

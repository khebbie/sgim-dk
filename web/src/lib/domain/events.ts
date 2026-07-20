/**
 * Pure event-feed logic shared by pages: merge the two event kinds into one
 * chronologically-sorted "upcoming" feed. `now` is injected (constitution:
 * Determinism) so this is deterministic and unit-testable. No I/O, no framework.
 */
import type { EventItem } from './content';

/** A single event is upcoming until it ends (or starts, if no end). */
function isUpcoming(event: EventItem, now: Date): boolean {
	if (event.kind === 'single') return (event.end ?? event.start).getTime() >= now.getTime();
	return event.endDate.getTime() >= now.getTime();
}

function startOf(event: EventItem): number {
	return event.kind === 'single' ? event.start.getTime() : event.startDate.getTime();
}

/** Merged, ascending-by-start feed of events that have not yet finished. */
export function upcomingFeed(events: EventItem[], now: Date): EventItem[] {
	return events.filter((event) => isUpcoming(event, now)).sort((a, b) => startOf(a) - startOf(b));
}

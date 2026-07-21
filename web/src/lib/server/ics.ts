/**
 * ICS calendar feed generation (sgim-pgx.16 / sgim-3ya.2).
 *
 * Hand-rolled RFC 5545 serialisation — no third-party library. The 'ics' npm
 * package is CommonJS and breaks under Vite's SSR module runner ("exports is
 * not defined"); this pure serialiser has no such interop problem and works
 * identically in dev and production.
 *
 * Timed single-day events become timed VEVENTs (UTC). Untimed single-day and
 * multi-day events become all-day VEVENTs (VALUE=DATE, DTEND end-exclusive).
 *
 * The CMS is only used by the website and admin, so the website builds the feed.
 */
import type { EventItem } from '$lib/domain/content';

const CRLF = '\r\n';
/** Default length for a timed event with no explicit end, so DTEND != DTSTART. */
const DEFAULT_DURATION_MINUTES = 90;

const pad = (n: number): string => String(n).padStart(2, '0');

/** All-day date value: YYYYMMDD from local calendar parts. */
function formatDate(date: Date): string {
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** UTC timestamp value: YYYYMMDDTHHMMSSZ (the absolute instant). */
function formatDateTimeUtc(date: Date): string {
	return (
		`${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
		`T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
	);
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60_000);
}

/** A start at exactly 00:00 means the CMS entry carries no time -> all-day. */
function isAllDay(date: Date): boolean {
	return date.getHours() === 0 && date.getMinutes() === 0;
}

/** Escape a TEXT value per RFC 5545 §3.3.11 (backslash, semicolon, comma, newline). */
function escapeText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n');
}

/** Fold a content line to <=75 octets with CRLF + space continuations (§3.1). */
function foldLine(line: string): string {
	if (Buffer.byteLength(line, 'utf8') <= 75) return line;
	const parts: string[] = [];
	let current = '';
	let bytes = 0;
	for (const ch of line) {
		const chBytes = Buffer.byteLength(ch, 'utf8');
		const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
		if (bytes + chBytes > limit) {
			parts.push(current);
			current = '';
			bytes = 0;
		}
		current += ch;
		bytes += chBytes;
	}
	parts.push(current);
	return parts.join(`${CRLF} `);
}

function removeHtmlTags(html: string): string {
	return html.replace(/<[^>]*>/g, '');
}

function eventLines(event: EventItem): string[] {
	const lines = [
		'BEGIN:VEVENT',
		`UID:sgim-event-${event.id}@sgim.dk`,
		`DTSTAMP:${formatDateTimeUtc(new Date())}`
	];

	if (event.kind === 'multiday') {
		// All-day span; DTEND is exclusive, so add one day to the last day.
		lines.push(`DTSTART;VALUE=DATE:${formatDate(event.startDate)}`);
		lines.push(`DTEND;VALUE=DATE:${formatDate(addDays(event.endDate, 1))}`);
	} else if (isAllDay(event.start)) {
		lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start)}`);
		lines.push(`DTEND;VALUE=DATE:${formatDate(addDays(event.start, 1))}`);
	} else {
		const end = event.end ?? addMinutes(event.start, DEFAULT_DURATION_MINUTES);
		lines.push(`DTSTART:${formatDateTimeUtc(event.start)}`);
		lines.push(`DTEND:${formatDateTimeUtc(end)}`);
	}

	lines.push(`SUMMARY:${escapeText(event.title)}`);
	if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
	const description = removeHtmlTags(event.descriptionHtml).trim();
	if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
	lines.push('END:VEVENT');
	return lines;
}

/** Generates an ICS calendar feed from all events (single-day and multi-day). */
export function generateIcsCalendar(events: EventItem[]): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//sgim.dk//SGIM Kalender//DA',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'NAME:SGIM Arrangementer',
		'X-WR-CALNAME:SGIM Arrangementer',
		'X-PUBLISHED-TTL:PT1H',
		...events.flatMap(eventLines),
		'END:VCALENDAR'
	];
	return lines.map(foldLine).join(CRLF) + CRLF;
}

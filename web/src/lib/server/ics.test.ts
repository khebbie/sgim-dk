import { describe, it, expect } from 'vitest';
import { generateIcsCalendar } from './ics';
import type { SingleEvent, MultiDayEvent } from '$lib/domain/content';

const makeEvent = (overrides: Partial<SingleEvent> = {}): SingleEvent => ({
	kind: 'single',
	id: 'test-1',
	slug: 'test-1',
	title: 'Test Event',
	start: new Date('2026-07-21T19:00:00'),
	end: new Date('2026-07-21T21:00:00'),
	location: 'Test Location',
	descriptionHtml: '<p>Test description</p>',
	...overrides
});

const makeMultiDay = (overrides: Partial<MultiDayEvent> = {}): MultiDayEvent => ({
	kind: 'multiday',
	id: 'multi-1',
	slug: 'multi-1',
	title: 'Bibeluge',
	startDate: new Date('2026-08-03T00:00:00'),
	endDate: new Date('2026-08-07T00:00:00'),
	location: 'Missionshuset',
	descriptionHtml: '',
	...overrides
});

describe('generateIcsCalendar', () => {
	it('returns valid ICS for empty event list', () => {
		const ics = generateIcsCalendar([]);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain('END:VCALENDAR');
		expect(ics).toContain('PRODID:');
	});

	it('includes event title', () => {
		const event = makeEvent({ title: 'Special Meeting' });
		const ics = generateIcsCalendar([event]);
		expect(ics).toContain('SUMMARY:Special Meeting');
	});

	it('includes event location', () => {
		const event = makeEvent({ location: 'Church Hall' });
		const ics = generateIcsCalendar([event]);
		expect(ics).toContain('LOCATION:Church Hall');
	});

	it('strips HTML tags from description', () => {
		const event = makeEvent({ descriptionHtml: '<p>Hello <strong>World</strong></p>' });
		const ics = generateIcsCalendar([event]);
		expect(ics).toContain('DESCRIPTION:Hello World');
		expect(ics).not.toContain('<p>');
		expect(ics).not.toContain('</p>');
	});

	it('includes multiple events', () => {
		const event1 = makeEvent({ id: '1', title: 'Event 1' });
		const event2 = makeEvent({ id: '2', title: 'Event 2' });
		const ics = generateIcsCalendar([event1, event2]);
		expect(ics).toContain('SUMMARY:Event 1');
		expect(ics).toContain('SUMMARY:Event 2');
	});

	it('generates unique UIDs for each event', () => {
		const event1 = makeEvent({ id: '1' });
		const event2 = makeEvent({ id: '2' });
		const ics = generateIcsCalendar([event1, event2]);
		expect(ics).toContain('UID:sgim-event-1@sgim.dk');
		expect(ics).toContain('UID:sgim-event-2@sgim.dk');
	});

	it('handles events without end time by using start time', () => {
		const eventWithoutEnd: SingleEvent = {
			kind: 'single',
			id: 'no-end',
			slug: 'no-end',
			title: 'Event without end',
			start: new Date('2026-07-21T19:00:00'),
			descriptionHtml: ''
		};
		const ics = generateIcsCalendar([eventWithoutEnd]);
		expect(ics).toContain('SUMMARY:Event without end');
	});

	it('includes calendar name', () => {
		const ics = generateIcsCalendar([]);
		expect(ics).toContain('NAME:SGIM Arrangementer');
	});

	// sgim-3ya.2: multi-day events were previously dropped entirely.
	it('emits a multi-day event as an all-day span (end-exclusive)', () => {
		const ics = generateIcsCalendar([makeMultiDay()]);
		expect(ics).toContain('SUMMARY:Bibeluge');
		expect(ics).toContain('DTSTART;VALUE=DATE:20260803');
		// DTEND is exclusive, so the 7th spans through to the 8th.
		expect(ics).toContain('DTEND;VALUE=DATE:20260808');
	});

	it('emits an untimed single-day event as all-day', () => {
		const event = makeEvent({ start: new Date('2026-08-14T00:00:00'), end: undefined });
		const ics = generateIcsCalendar([event]);
		expect(ics).toContain('DTSTART;VALUE=DATE:20260814');
		expect(ics).toContain('DTEND;VALUE=DATE:20260815');
	});

	// sgim-3ya.2: timed events had DTEND == DTSTART (zero duration). Default a length.
	// (Absolute UTC values depend on the machine TZ, so assert the duration property.)
	it('gives a timed event without an end a non-zero duration', () => {
		const event = makeEvent({ start: new Date('2026-07-21T19:00:00'), end: undefined });
		const ics = generateIcsCalendar([event]);
		const dtstart = /DTSTART:(\d{8}T\d{6}Z)/.exec(ics)?.[1];
		const dtend = /DTEND:(\d{8}T\d{6}Z)/.exec(ics)?.[1];
		expect(dtstart).toBeDefined();
		expect(dtend).toBeDefined();
		expect(dtend).not.toBe(dtstart);
	});
});

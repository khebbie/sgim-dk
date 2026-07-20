import { describe, it, expect } from 'vitest';
import { selectHomeView } from './home';
import type { Aktuelt } from './content';

const aktuelt: Aktuelt = { title: 'Sommerpause', bodyHtml: '<p>Ingen møder i juli</p>' };

describe('selectHomeView', () => {
	it('shows the takeover when an active Aktuelt exists', () => {
		expect(selectHomeView([aktuelt])).toEqual({ mode: 'takeover', aktuelt });
	});
	it('shows the default homepage when there is no active Aktuelt', () => {
		expect(selectHomeView([])).toEqual({ mode: 'default' });
	});
});

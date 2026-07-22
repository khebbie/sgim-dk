import { describe, it, expect } from 'vitest';
import { legacyRedirect, LEGACY_REDIRECTS } from './legacy-redirects';

describe('legacyRedirect', () => {
	it('maps the legacy pages that were live on the old site', () => {
		expect(legacyRedirect('/home.aspx')).toBe('/');
		expect(legacyRedirect('/program.aspx')).toBe('/kalender');
		expect(legacyRedirect('/klubber.aspx')).toBe('/klubber');
		expect(legacyRedirect('/om-os.aspx')).toBe('/om-os');
	});

	it('maps the per-club pages onto the club records that replaced them', () => {
		expect(legacyRedirect('/juniorklub.aspx')).toBe('/klubber/juniorklubben');
		expect(legacyRedirect('/teenklub.aspx')).toBe('/klubber/teenklubben');
		expect(legacyRedirect('/imu.aspx')).toBe('/klubber/imu');
	});

	// Old links and indexed URLs use inconsistent casing.
	it('is case-insensitive', () => {
		expect(legacyRedirect('/Program.aspx')).toBe('/kalender');
		expect(legacyRedirect('/HOME.ASPX')).toBe('/');
	});

	it('returns undefined for anything else, so normal routing continues', () => {
		expect(legacyRedirect('/kalender')).toBeUndefined();
		expect(legacyRedirect('/')).toBeUndefined();
		expect(legacyRedirect('/nonsense.aspx')).toBeUndefined();
	});

	it('only ever targets paths on this site', () => {
		for (const target of Object.values(LEGACY_REDIRECTS)) {
			expect(target.startsWith('/')).toBe(true);
			expect(target.startsWith('//')).toBe(false); // would be protocol-relative
		}
	});
});

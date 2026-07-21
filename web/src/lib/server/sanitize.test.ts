import { describe, it, expect } from 'vitest';
import { sanitizeRichText } from './sanitize';

describe('sanitizeRichText', () => {
	it('keeps the rich-text tags used by CMS content', () => {
		const html =
			'<h2>Kontakt</h2><p><strong>Formand:</strong> Kenneth</p><p>a<br />b</p>' +
			'<a href="mailto:x@sgim.dk">mail</a><ul><li>en</li></ul>';
		const out = sanitizeRichText(html);
		expect(out).toContain('<h2>Kontakt</h2>');
		expect(out).toContain('<strong>Formand:</strong>');
		expect(out).toContain('<br />');
		expect(out).toContain('<a href="mailto:x@sgim.dk">mail</a>');
		expect(out).toContain('<li>en</li>');
	});

	// Regression (sgim-3ya.3): content headings must be h2+ (Markdown '##'), not
	// h1 ('#'). h1 is reserved for the page title and is NOT in the allowlist, so
	// a '#' heading is silently stripped to plain text. Guard that constraint.
	it('strips h1 (page title owns the only h1)', () => {
		const out = sanitizeRichText('<h1>Kontakt</h1>');
		expect(out).not.toContain('<h1>');
		expect(out).toContain('Kontakt');
	});

	it('drops disallowed tags and scripts', () => {
		expect(sanitizeRichText('<script>alert(1)</script><p>ok</p>')).toBe('<p>ok</p>');
	});
});

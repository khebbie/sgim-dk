import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './markdown-to-html';

describe('markdownToHtml', () => {
	it('converts Markdown headings to HTML', () => {
		expect(markdownToHtml('## Om os')).toContain('<h2>Om os</h2>');
	});

	it('converts bold text and links', () => {
		const html = markdownToHtml('En **fed** tekst med [link](https://sgim.dk).');
		expect(html).toContain('<strong>fed</strong>');
		expect(html).toContain('<a href="https://sgim.dk">link</a>');
	});

	it('passes existing HTML through', () => {
		expect(markdownToHtml('<p>hej</p>')).toContain('<p>hej</p>');
	});

	it('returns empty string for empty or non-string input', () => {
		expect(markdownToHtml('')).toBe('');
		expect(markdownToHtml(undefined as unknown as string)).toBe('');
		expect(markdownToHtml(null as unknown as string)).toBe('');
	});
});

import { describe, it, expect } from 'vitest';
import { markdownToHtml } from './markdown-to-html';

describe('markdownToHtml', () => {
	it('converts markdown headings to HTML', () => {
		expect(markdownToHtml('# Heading 1')).toBe('<h1>Heading 1</h1>');
	});
	it('converts markdown paragraphs to HTML', () => {
		expect(markdownToHtml('Some text')).toBe('<p>Some text</p>');
	});
	it('converts markdown bold to HTML', () => {
		expect(markdownToHtml('**bold**')).toBe('<strong>bold</strong>');
	});
	it('converts markdown italic to HTML', () => {
		expect(markdownToHtml('*italic*')).toBe('<em>italic</em>');
	});
	it('converts markdown links to HTML', () => {
		expect(markdownToHtml('[link](https://example.com)')).toBe(
			'<p><a href="https://example.com">link</a></p>'
		);
	});
	it('converts markdown lists to HTML', () => {
		const result = markdownToHtml('- item 1\n- item 2');
		expect(result).toContain('<ul>');
		expect(result).toContain('<li>item 1</li>');
		expect(result).toContain('<li>item 2</li>');
	});
	it('returns empty string for empty input', () => {
		expect(markdownToHtml('')).toBe('');
	});
	it('returns empty string for non-string input', () => {
		// @ts-expect-error - testing runtime behavior
		expect(markdownToHtml(null)).toBe('');
	});
	it('passes through HTML unchanged', () => {
		// HTML is valid markdown, so it should pass through
		expect(markdownToHtml('<p>already html</p>')).toBe('<p>already html</p>');
	});
});

/**
 * Converts markdown content from Strapi to HTML.
 * Strapi v5 richtext fields use markdown by default, but the frontend
 * expects HTML for rendering with {@html}.
 *
 * Uses marked.js which is a fast markdown compiler that produces
 * HTML matching GitHub Flavored Markdown.
 */
import { marked } from 'marked';

export function markdownToHtml(markdown: string): string {
	if (typeof markdown !== 'string' || markdown.length === 0) {
		return '';
	}
	// marked v14+ returns a promise for async operations, but parse is sync
	// The result is already a string
	return marked.parse(markdown) as string;
}

/**
 * Server-side sanitiser for CMS-authored rich text (constitution: Defensive
 * Boundaries — sanitise at every system boundary). Rich-text HTML from the CMS
 * is untrusted input; run it through here before any `{@html}` render. Shared
 * by the homepage (sgim-x60.5) and static pages (sgim-x60.7).
 */
import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: [
		'p',
		'br',
		'strong',
		'em',
		'u',
		'a',
		'ul',
		'ol',
		'li',
		'blockquote',
		'h2',
		'h3',
		'h4',
		'img'
	],
	allowedAttributes: {
		a: ['href', 'title', 'target', 'rel'],
		img: ['src', 'alt']
	},
	allowedSchemes: ['http', 'https', 'mailto', 'tel']
};

export function sanitizeRichText(html: string): string {
	return sanitizeHtml(html, OPTIONS);
}

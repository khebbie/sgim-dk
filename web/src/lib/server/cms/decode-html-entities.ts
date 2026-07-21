/**
 * Decode HTML entities in strings.
 * Uses the 'he' library which properly handles all HTML entities including
 * named entities (&quot;, &amp;, etc.) and numeric entities (&#197;, &#xC5;, etc.).
 */
import he from 'he';

export function decodeHtmlEntities(text: string | undefined): string {
	if (!text) return '';
	return he.decode(text);
}

/**
 * Pure homepage view selection. The CMS decides which Aktuelt entries are
 * "active" (enabled + within their date window); this just picks the takeover
 * when one exists, else the default homepage. Kept pure so it is unit-testable
 * without a component or a live CMS (constitution: pure selection logic).
 */
import type { Aktuelt } from './content';

export type HomeView = { mode: 'takeover'; aktuelt: Aktuelt } | { mode: 'default' };

export function selectHomeView(activeAktuelt: Aktuelt[]): HomeView {
	const [first] = activeAktuelt;
	return first ? { mode: 'takeover', aktuelt: first } : { mode: 'default' };
}

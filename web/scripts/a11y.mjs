/**
 * Accessibility check (sgim-x60.12): runs axe-core (WCAG 2.1 A/AA) against the
 * key pages and fails on any serious/critical violation. Requires the site to
 * be running.  Usage:  BASE_URL=http://localhost:3100 node scripts/a11y.mjs
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3100';
const identifier = process.env.MEMBER_EMAIL ?? 'medlem@sgim.dk';
const password = process.env.MEMBER_PASSWORD ?? 'Medlem1234';

const publicPages = ['/', '/kalender', '/klubber', '/om-os', '/login'];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

async function audit(path) {
	await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
	const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
	const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	const label = serious.length === 0 ? 'ok' : `${serious.length} serious/critical`;
	console.log(`${path.padEnd(12)} ${label}`);
	for (const v of serious) {
		console.log(`   - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
	}
	return serious.length;
}

let failures = 0;
for (const path of publicPages) failures += await audit(path);

// Members area needs a logged-in session.
await page.goto(baseUrl + '/login', { waitUntil: 'networkidle' });
await page.fill('input[name=identifier]', identifier);
await page.fill('input[name=password]', password);
await page.click('button[type=submit]');
await page.waitForLoadState('networkidle');
failures += await audit('/members');

await browser.close();
console.log(
	failures === 0 ? '\nA11y: all pages pass (WCAG A/AA)' : `\nA11y: ${failures} violation(s)`
);
process.exit(failures === 0 ? 0 : 1);

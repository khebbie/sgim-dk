/**
 * Simple Playwright smoke/screenshot script for the sgim.dk site.
 * Assumes the site is running (default http://localhost:3000). Usage:
 *   BASE_URL=http://localhost:3000 OUT_DIR=./shots node scripts/screenshot.mjs
 * Captures the homepage (and a couple of nav destinations) and prints the
 * <h1>/<h2> headings it finds, so you can eyeball that real content rendered.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const outDir = process.env.OUT_DIR ?? 'shots';
mkdirSync(outDir, { recursive: true });

const pages = [
	{ path: '/', name: 'home' },
	{ path: '/kalender', name: 'kalender' },
	{ path: '/klubber', name: 'klubber' },
	{ path: '/om-os', name: 'om-os' }
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });

for (const { path, name } of pages) {
	const page = await context.newPage();
	const response = await page.goto(baseUrl + path, { waitUntil: 'networkidle' });
	const headings = await page.locator('h1, h2').allInnerTexts();
	const file = join(outDir, `${name}.png`);
	await page.screenshot({ path: file, fullPage: true });
	console.log(
		`${path} -> HTTP ${response?.status()} | ${file} | headings: ${JSON.stringify(headings)}`
	);
	await page.close();
}

await browser.close();

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import EventItem from '$lib/components/EventItem.svelte';
	import { findMonthToFocus } from '$lib/domain/calendar';

	let { data }: { data: PageData } = $props();
	let monthSections: Record<string, HTMLElement | null> = {};

	// Subscribe feed. The absolute https URL is for "add from URL" (Google etc.);
	// the webcal:// variant opens straight in Apple Calendar / Outlook.
	const feedPath = '/api/v1/events/ics';
	const feedUrl = $derived(`${page.url.origin}${feedPath}`);
	const webcalUrl = $derived(`webcal://${page.url.host}${feedPath}`);

	let copied = $state(false);
	async function copyFeedUrl() {
		try {
			await navigator.clipboard.writeText(feedUrl);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard unavailable (e.g. insecure context) — the link is still
			// shown in the guidance panel for manual copying.
		}
	}

	function scrollToCurrentMonth() {
		if (!data.year || data.months.length === 0) return;

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const monthToFocus = findMonthToFocus(data.year, data.months);
		if (monthToFocus === null) return;

		const section = monthSections[`${monthToFocus}`];
		if (!section) return;

		section.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
	}

	onMount(() => {
		requestAnimationFrame(scrollToCurrentMonth);
	});
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Kalender {data.year ?? ''} – Stjær/Galten Indre Mission</title>
</svelte:head>

<h1>Kalender {data.year ?? ''}</h1>

<!-- Fixed, collapsible subscribe control: stays visible after the page
     auto-scrolls to the current month. -->
<details class="cal-subscribe">
	<summary>
		<span aria-hidden="true">📅</span>
		Abonnér på kalender
	</summary>
	<div class="cal-subscribe__panel">
		<p>Abonnér, så nye og ændrede arrangementer automatisk kommer med i din egen kalender.</p>
		<div class="cal-subscribe__actions">
			<a class="btn" href={webcalUrl}>Tilføj til din kalender</a>
			<button type="button" class="btn-outline" onclick={copyFeedUrl}>
				{copied ? 'Link kopieret ✓' : 'Kopiér kalender-link'}
			</button>
			<a class="btn-outline" href={feedPath} download="sgim-kalender.ics">Hent som fil (.ics)</a>
		</div>
		<ul class="cal-subscribe__hints">
			<li><strong>Google:</strong> Andre kalendere → Fra URL → indsæt linket.</li>
			<li>
				<strong>Apple:</strong> Tryk “Tilføj til din kalender”, eller Arkiv → Nyt kalenderabonnement.
			</li>
			<li><strong>Outlook:</strong> Tilføj kalender → Abonnér fra internettet → indsæt linket.</li>
		</ul>
		<p class="cal-subscribe__url"><code>{feedUrl}</code></p>
	</div>
</details>

{#if data.years.length > 1}
	<nav class="years" aria-label="Vælg år">
		{#each data.years as y (y)}
			<a
				href={`?year=${y}`}
				class:active={y === data.year}
				aria-current={y === data.year ? 'page' : undefined}
			>
				{y}
			</a>
		{/each}
	</nav>
{/if}

{#if data.months.length === 0}
	<p>Der er ingen arrangementer{data.year ? ` i ${data.year}` : ''}.</p>
{:else}
	{#each data.months as month (month.month)}
		<section class="month" bind:this={monthSections[`${month.month}`]} data-month={month.month}>
			<h2>{month.name}</h2>
			<ul class="event-list">
				{#each month.events as event (event.id)}
					<EventItem {event} href={`/kalender/${event.slug}`} />
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<style>
	.years {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}
	.years a {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		text-decoration: none;
	}
	.years a.active {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-color: var(--color-primary);
	}
	.month {
		margin-top: var(--space-5);
	}
	.month h2 {
		border-bottom: 2px solid var(--color-accent);
		padding-bottom: var(--space-2);
		margin-bottom: var(--space-2);
	}
	.event-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	/* Fixed, collapsible subscribe control (bottom-right), always in view. */
	.cal-subscribe {
		position: fixed;
		right: var(--space-3);
		bottom: var(--space-3);
		z-index: 30;
	}
	.cal-subscribe > summary {
		list-style: none;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-radius: 2rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		box-shadow: var(--shadow-md);
	}
	.cal-subscribe > summary::-webkit-details-marker {
		display: none;
	}
	.cal-subscribe > summary:hover {
		background: var(--color-primary-hover);
	}
	.cal-subscribe[open] > summary {
		border-radius: var(--radius-base);
	}
	.cal-subscribe__panel {
		position: absolute;
		right: 0;
		bottom: calc(100% + var(--space-2));
		width: min(22rem, calc(100vw - 2 * var(--space-3)));
		max-height: 70vh;
		overflow-y: auto;
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-accent);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}
	.cal-subscribe__panel p {
		margin: 0 0 var(--space-2);
	}
	.cal-subscribe__actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin: var(--space-3) 0;
	}
	.btn,
	.btn-outline {
		display: block;
		text-align: center;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-primary);
		border-radius: var(--radius-base);
		font: inherit;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
	}
	.btn {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
	}
	.btn:hover {
		background: var(--color-primary-hover);
	}
	.btn-outline {
		background: none;
		color: var(--color-primary);
	}
	.btn-outline:hover {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
	}
	.cal-subscribe__hints {
		margin: 0 0 var(--space-2);
		padding-left: var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}
	.cal-subscribe__hints li {
		margin-bottom: var(--space-1);
	}
	.cal-subscribe__url {
		margin: 0;
	}
	.cal-subscribe__url code {
		font-size: 0.8rem;
		word-break: break-all;
		color: var(--color-muted);
	}
</style>

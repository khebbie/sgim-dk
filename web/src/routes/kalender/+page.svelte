<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import EventItem from '$lib/components/EventItem.svelte';
	import { findMonthToFocus } from '$lib/domain/calendar';

	let { data }: { data: PageData } = $props();
	let monthSections: Record<string, HTMLElement | null> = {};

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

<p class="ics-link">
	<a href="/api/v1/events/ics" download="sgim-kalender.ics">Abonner på kalender (ICS)</a>
</p>

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
	.ics-link {
		margin-bottom: var(--space-4);
	}
	.ics-link a {
		display: inline-block;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--color-primary);
		color: var(--color-primary);
		border-radius: var(--radius-base);
		text-decoration: none;
		font-weight: 600;
	}
	.ics-link a:hover {
		background: var(--color-primary);
		color: var(--color-primary-contrast);
	}
</style>

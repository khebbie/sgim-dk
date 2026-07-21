<script lang="ts">
	import type { PageData } from './$types';
	import { formatEventWhen } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Kalender {data.year ?? ''} – Stjær/Galten Indre Mission</title>
</svelte:head>

<h1>Kalender {data.year ?? ''}</h1>

<p class="ics-link">
	<a href="/api/v1/events/ics" download="sgim-kalender.ics"> Abonner paa kalender (ICS) </a>
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
		<section class="month">
			<h2>{month.name}</h2>
			<ul class="events">
				{#each month.events as event (event.id)}
					<li>
						<time>{formatEventWhen(event)}</time>
						<a class="event-title" href={`/kalender/${event.slug}`}>{event.title}</a>
						{#if event.speaker}<span class="event-speaker">v/ {event.speaker}</span>{/if}
						{#if event.location}<span class="event-location">· {event.location}</span>{/if}
					</li>
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
		margin-top: var(--space-4);
	}
	.month h2 {
		border-bottom: 2px solid var(--color-border);
		padding-bottom: var(--space-1);
	}
	.events {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.events li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}
	.events time {
		color: var(--color-muted);
		min-width: 14rem;
	}
	.event-title {
		font-weight: 600;
	}
	.event-speaker,
	.event-location {
		color: var(--color-muted);
	}
	.ics-link {
		margin-bottom: var(--space-4);
	}
	.ics-link a {
		padding: var(--space-2) var(--space-3);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-radius: var(--radius-base);
		text-decoration: none;
		font-weight: 500;
	}
	.ics-link a:hover {
		text-decoration: underline;
	}
</style>

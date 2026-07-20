<script lang="ts">
	import type { PageData } from './$types';
	import { formatEventWhen } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Kalender – Stjær/Galten Indre Mission</title>
</svelte:head>

<h1>Kalender</h1>

{#if data.events.length === 0}
	<p>Der er ingen kommende arrangementer lige nu.</p>
{:else}
	<ul class="events">
		{#each data.events as event (event.id)}
			<li>
				<time>{formatEventWhen(event)}</time>
				<a class="event-title" href={`/kalender/${event.slug}`}>{event.title}</a>
				{#if event.speaker}<span class="event-speaker">v/ {event.speaker}</span>{/if}
				{#if event.location}<span class="event-location">· {event.location}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
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
		min-width: 12rem;
	}
	.event-title {
		font-weight: 600;
	}
	.event-speaker,
	.event-location {
		color: var(--color-muted);
	}
</style>

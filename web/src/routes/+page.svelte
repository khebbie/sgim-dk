<script lang="ts">
	import type { PageData } from './$types';
	import { formatEventWhen } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<!-- The Aktuelt CTA is a CMS-provided arbitrary URL, not a compile-time route id. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Stjær/Galten Indre Mission</title>
</svelte:head>

{#if data.view.mode === 'takeover'}
	{@const aktuelt = data.view.aktuelt}
	<section class="takeover" aria-label="Aktuelt">
		<h1>{aktuelt.title}</h1>
		{#if aktuelt.imageUrl}
			<img src={aktuelt.imageUrl} alt="" class="takeover-image" />
		{/if}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
		<div class="rich">{@html aktuelt.bodyHtml}</div>
		{#if aktuelt.ctaUrl && aktuelt.ctaLabel}
			<a class="cta" href={aktuelt.ctaUrl}>{aktuelt.ctaLabel}</a>
		{/if}
	</section>
{:else}
	<section aria-label="Velkommen">
		{#if data.intro}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
			<div class="rich">{@html data.intro}</div>
		{:else}
			<h1>Stjær/Galten Indre Mission</h1>
		{/if}
	</section>

	<section aria-labelledby="upcoming-heading">
		<h2 id="upcoming-heading">Kommende arrangementer</h2>
		{#if data.upcomingEvents.length === 0}
			<p>Der er ingen kommende arrangementer lige nu.</p>
		{:else}
			<ul class="events">
				{#each data.upcomingEvents as event (event.id)}
					<li>
						<time>{formatEventWhen(event)}</time>
						<span class="event-title">{event.title}</span>
						{#if event.speaker}<span class="event-speaker">v/ {event.speaker}</span>{/if}
						{#if event.location}<span class="event-location">· {event.location}</span>{/if}
					</li>
				{/each}
			</ul>
			<p class="see-all"><a href="/kalender">Se hele kalenderen →</a></p>
		{/if}
	</section>
{/if}

<style>
	.takeover-image {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-base);
		margin: var(--space-3) 0;
	}
	.cta {
		display: inline-block;
		margin-top: var(--space-3);
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-radius: var(--radius-base);
		text-decoration: none;
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

<script lang="ts">
	import type { PageData } from './$types';
	import EventItem from '$lib/components/EventItem.svelte';

	let { data }: { data: PageData } = $props();

	// The mission house is the org's identity — the default hero image, and the
	// fallback when an Aktuelt takeover doesn't carry its own picture.
	const bethesda = '/bethesda.jpg';
</script>

<!-- The Aktuelt CTA is a CMS-provided arbitrary URL, not a compile-time route id. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Stjær/Galten Indre Mission</title>
</svelte:head>

{#if data.view.mode === 'takeover'}
	{@const aktuelt = data.view.aktuelt}
	<section class="hero" aria-label="Aktuelt">
		<div class="hero-media">
			<img src={aktuelt.imageUrl ?? bethesda} alt="Missionshuset Bethesda i Galten" />
		</div>
		<div class="hero-body">
			<p class="eyebrow">Aktuelt</p>
			<h1>{aktuelt.title}</h1>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
			<div class="rich">{@html aktuelt.bodyHtml}</div>
			{#if aktuelt.ctaUrl && aktuelt.ctaLabel}
				<a class="cta" href={aktuelt.ctaUrl}>{aktuelt.ctaLabel}</a>
			{/if}
		</div>
	</section>
{:else}
	<section class="hero" aria-label="Velkommen">
		<div class="hero-media">
			<img src={bethesda} alt="Missionshuset Bethesda i Galten" />
		</div>
		<div class="hero-body">
			<p class="eyebrow">Velkommen til</p>
			{#if data.intro}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
				<div class="rich hero-intro">{@html data.intro}</div>
			{:else}
				<h1>Stjær/Galten Indre Mission</h1>
			{/if}
		</div>
	</section>
{/if}

<!-- Always show the upcoming events list regardless of takeover/default view -->
<section class="upcoming" aria-labelledby="upcoming-heading">
	<div class="upcoming-head">
		<h2 id="upcoming-heading">Kommende arrangementer</h2>
		{#if data.upcomingEvents.length > 0}
			<a class="see-all" href="/kalender">Se hele kalenderen →</a>
		{/if}
	</div>
	{#if data.upcomingEvents.length === 0}
		<p class="empty">Der er ingen kommende arrangementer lige nu.</p>
	{:else}
		<ul class="event-list">
			{#each data.upcomingEvents as event (event.id)}
				<EventItem {event} href={`/kalender/${event.slug}`} />
			{/each}
		</ul>
	{/if}
</section>

<style>
	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: 3px solid var(--color-accent);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		overflow: hidden;
		margin-bottom: var(--space-6);
	}
	.hero-media {
		order: 2;
	}
	.hero-media img {
		display: block;
		width: 100%;
		height: 100%;
		min-height: 16rem;
		object-fit: cover;
	}
	.hero-body {
		padding: var(--space-5);
	}
	.hero h1 {
		margin: 0 0 var(--space-3);
	}
	.hero-intro :global(h1),
	.hero-intro :global(h2) {
		margin-top: 0;
	}

	.cta {
		display: inline-block;
		margin-top: var(--space-4);
		padding: var(--space-2) var(--space-5);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-radius: var(--radius-base);
		font-weight: 600;
		text-decoration: none;
		box-shadow: var(--shadow-sm);
	}
	.cta:hover {
		background: var(--color-primary-hover);
		color: var(--color-primary-contrast);
	}

	.upcoming-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}
	.upcoming-head h2 {
		margin: 0;
	}
	.see-all {
		font-weight: 600;
		text-decoration: none;
	}
	.see-all:hover {
		text-decoration: underline;
	}
	.event-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.empty {
		color: var(--color-muted);
	}

	@media (max-width: 46rem) {
		.hero {
			grid-template-columns: 1fr;
		}
		.hero-media {
			order: 0;
		}
		.hero-media img {
			min-height: 0;
			max-height: 15rem;
		}
		.hero-body {
			padding: var(--space-4);
		}
	}
</style>

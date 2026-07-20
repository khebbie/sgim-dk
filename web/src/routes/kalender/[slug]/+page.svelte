<script lang="ts">
	import type { PageData } from './$types';
	import { formatEventWhen } from '$lib/format';

	let { data }: { data: PageData } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>{data.event.title} – Stjær/Galten Indre Mission</title>
</svelte:head>

<article>
	<p><a href="/kalender">← Tilbage til kalenderen</a></p>
	<h1>{data.event.title}</h1>
	<p class="meta">
		<time>{formatEventWhen(data.event)}</time>
		{#if data.event.location}<span>· {data.event.location}</span>{/if}
	</p>
	{#if data.event.speaker}<p class="speaker">v/ {data.event.speaker}</p>{/if}
	{#if data.event.descriptionHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
		<div class="rich">{@html data.event.descriptionHtml}</div>
	{/if}
</article>

<style>
	.meta {
		color: var(--color-muted);
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
</style>

<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.page.title} – Stjær/Galten Indre Mission</title>
	{#if data.page.seoDescription}<meta name="description" content={data.page.seoDescription} />{/if}
</svelte:head>

<article>
	<h1>{data.page.title}</h1>
	{#if data.page.heroImageUrl}
		<img class="hero" src={data.page.heroImageUrl} alt="" />
	{/if}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
	<div class="rich">{@html data.page.bodyHtml}</div>
</article>

<style>
	.hero {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-base);
		margin: var(--space-3) 0;
	}
</style>

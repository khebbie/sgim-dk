<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const club = $derived(data.club);
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>{club.name} – Stjær/Galten Indre Mission</title>
</svelte:head>

<article>
	<p><a href="/klubber">← Tilbage til klubber</a></p>
	<h1>{club.name}</h1>
	<dl class="facts">
		{#if club.ageGroup}<dt>Aldersgruppe</dt>
			<dd>{club.ageGroup}</dd>{/if}
		{#if club.meetingSchedule}<dt>Mødetid</dt>
			<dd>{club.meetingSchedule}</dd>{/if}
		{#if club.contactPersonName}<dt>Kontakt</dt>
			<dd>
				{club.contactPersonName}{#if club.contactEmail}
					(<a href={`mailto:${club.contactEmail}`}>{club.contactEmail}</a>){/if}
			</dd>{/if}
	</dl>
	{#if club.descriptionHtml}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitised in +page.server.ts -->
		<div class="rich">{@html club.descriptionHtml}</div>
	{/if}
</article>

<style>
	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--space-1) var(--space-3);
		margin: var(--space-3) 0;
	}
	.facts dt {
		font-weight: 600;
		color: var(--color-muted);
	}
	.facts dd {
		margin: 0;
	}
</style>

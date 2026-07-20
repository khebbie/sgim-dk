<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<title>Klubber – Stjær/Galten Indre Mission</title>
</svelte:head>

<h1>Klubber</h1>

{#if data.clubs.length === 0}
	<p>Der er ingen klubber at vise lige nu.</p>
{:else}
	<ul class="clubs">
		{#each data.clubs as club (club.slug)}
			<li>
				<a class="name" href={`/klubber/${club.slug}`}>{club.name}</a>
				{#if club.ageGroup}<span class="age">{club.ageGroup}</span>{/if}
				{#if club.meetingSchedule}<span class="meet">· {club.meetingSchedule}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.clubs {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.clubs li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: baseline;
	}
	.name {
		font-weight: 600;
		font-size: var(--font-size-lg);
	}
	.age,
	.meet {
		color: var(--color-muted);
	}
</style>

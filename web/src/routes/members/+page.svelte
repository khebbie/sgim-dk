<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Medlemsområde – Stjær/Galten Indre Mission</title>
</svelte:head>

<div class="members-head">
	<h1>Medlemsområde</h1>
	<form method="POST" action="?/logout">
		<button type="submit" class="logout">Log ud</button>
	</form>
</div>

<p>Velkommen, {data.member.username}.</p>

<style>
	.members-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.logout {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		padding: var(--space-1) var(--space-3);
		cursor: pointer;
	}
</style>

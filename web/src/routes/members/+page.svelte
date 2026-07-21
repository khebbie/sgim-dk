<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { formatDate } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const me = $derived(data.member.username);
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

<p>Velkommen, {data.member.username}. Her fordeler vi tjanserne til møderne.</p>

{#if data.yearlyDuties.length > 0}
	<section class="summary">
		<h2>Årets tjanser</h2>
		<ul>
			{#each data.yearlyDuties as summary (summary.memberName)}
				<li>
					{summary.memberName}: {summary.completedDuties} tjanser i {new Date().getFullYear()}
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

{#each data.roster as meeting (meeting.eventSlug)}
	<section class="meeting">
		<h2>{meeting.eventTitle}</h2>
		<p class="date">{formatDate(meeting.start)}</p>
		<ul class="slots">
			{#each meeting.slots as slot (slot.id)}
				<li>
					<span class="cat">{slot.categoryName}</span>
					{#if !slot.memberName}
						<span class="open">Ledig</span>
						<form method="POST" action="?/claim">
							<input type="hidden" name="id" value={slot.id} />
							<button type="submit">Tag tjansen</button>
						</form>
					{:else if slot.memberName === me}
						<span class="mine">{slot.memberName} (dig)</span>
						<form method="POST" action="?/release">
							<input type="hidden" name="id" value={slot.id} />
							<button type="submit" class="release">Frigiv</button>
						</form>
					{:else}
						<span class="taken">{slot.memberName}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<p>Der er ingen tjanser at fordele lige nu.</p>
{/each}

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
	.error {
		color: #b00020;
		font-weight: 600;
	}
	.summary {
		margin: var(--space-4) 0;
		padding: var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		background: var(--color-surface-alt, #f8f8f8);
	}
	.summary ul {
		margin: 0;
		padding-left: var(--space-4);
	}
	.meeting {
		margin-top: var(--space-4);
	}
	.meeting .date {
		color: var(--color-muted);
		margin-top: calc(-1 * var(--space-2));
	}
	.slots {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.slots li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}
	.cat {
		font-weight: 600;
		min-width: 10rem;
	}
	.open {
		color: var(--color-muted);
	}
	.mine {
		font-weight: 600;
		color: var(--color-primary);
	}
	.slots button {
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border-radius: var(--radius-base);
		cursor: pointer;
	}
	.slots button.release {
		background: none;
		color: var(--color-primary);
	}
</style>

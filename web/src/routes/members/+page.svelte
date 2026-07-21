<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { formatDate } from '$lib/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const currentYear = new Date().getFullYear();
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
			{#each data.yearlyDuties as summary (summary.assignee)}
				<li>{summary.assignee}: {summary.count} tjanser i {currentYear}</li>
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
			{#each meeting.slots as slot (slot.categoryId)}
				<li>
					<span class="cat">{slot.categoryName}</span>
					{#if slot.assignee}
						<span class="assignee">{slot.assignee}</span>
						<form method="POST" action="?/release">
							<input type="hidden" name="id" value={slot.assignmentId} />
							<button type="submit" class="release">Fjern</button>
						</form>
					{:else}
						<form method="POST" action="?/claim" class="assign-form">
							<input type="hidden" name="event" value={meeting.eventId} />
							<input type="hidden" name="category" value={slot.categoryId} />
							<input
								type="text"
								name="assignee"
								placeholder="Navn"
								autocomplete="off"
								aria-label={`Tildel ${slot.categoryName}`}
							/>
							<button type="submit">Tildel</button>
						</form>
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
		border-left: 3px solid var(--color-accent);
		border-radius: var(--radius-base);
		background: var(--color-surface);
	}
	.summary ul {
		margin: 0;
		padding-left: var(--space-4);
	}
	.meeting {
		margin-top: var(--space-5);
	}
	.meeting h2 {
		font-size: var(--font-size-lg);
		margin-bottom: var(--space-1);
	}
	.meeting .date {
		color: var(--color-muted);
		margin-top: 0;
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
		flex-wrap: wrap;
		gap: var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--color-border);
	}
	.cat {
		font-weight: 600;
		min-width: 10rem;
	}
	.assignee {
		color: var(--color-primary);
		font-weight: 600;
	}
	.assign-form {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}
	.assign-form input {
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		font: inherit;
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

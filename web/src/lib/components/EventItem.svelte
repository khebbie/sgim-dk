<script lang="ts">
	import type { EventItem } from '$lib/domain/content';
	import { eventChip, formatEventWhen } from '$lib/format';

	// `href` links the title to the event detail page; omit it for a plain row.
	let { event, href }: { event: EventItem; href?: string } = $props();

	const chip = $derived(eventChip(event));
	const when = $derived(formatEventWhen(event));
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<li class="event">
	<span class="chip" aria-hidden="true">
		<span class="chip-weekday">{chip.weekday}</span>
		<span class="chip-day">{chip.day}</span>
		<span class="chip-month">{chip.month}</span>
	</span>
	<span class="event-body">
		{#if href}
			<a class="event-title" {href}>{event.title}</a>
		{:else}
			<span class="event-title">{event.title}</span>
		{/if}
		<span class="event-when">{when}</span>
		{#if event.speaker || event.location}
			<span class="event-meta">
				{#if event.speaker}<span>v/ {event.speaker}</span>{/if}
				{#if event.location}<span>· {event.location}</span>{/if}
			</span>
		{/if}
	</span>
</li>

<style>
	.event {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.event:last-child {
		border-bottom: none;
	}

	/* Signature: a small calendar marker with a brass edge. */
	.chip {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 3.5rem;
		padding: var(--space-2) 0;
		border: 1px solid var(--color-border);
		border-left: 3px solid var(--color-accent);
		border-radius: var(--radius-base);
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		line-height: 1;
	}
	.chip-weekday,
	.chip-month {
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: var(--tracking-label);
		text-transform: uppercase;
		color: var(--color-muted);
	}
	.chip-day {
		font-family: var(--font-serif);
		font-size: 1.6rem;
		font-weight: 600;
		color: var(--color-accent-strong);
		margin: 0.1rem 0;
	}

	.event-body {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding-top: 0.1rem;
	}
	.event-title {
		font-weight: 600;
		font-size: var(--font-size-lg);
		text-decoration: none;
	}
	a.event-title:hover {
		text-decoration: underline;
	}
	.event-when {
		color: var(--color-muted);
	}
	.event-meta {
		color: var(--color-muted);
	}
	.event-meta span {
		margin-right: 0.35rem;
	}
</style>

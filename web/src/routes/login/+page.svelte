<script lang="ts">
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Log ind – Stjær/Galten Indre Mission</title>
</svelte:head>

<h1>Log ind</h1>

{#if form?.error}
	<p class="error" role="alert">{form.error}</p>
{/if}

<form method="POST" class="login">
	<label>
		Email
		<input
			name="identifier"
			type="email"
			autocomplete="username"
			value={form?.identifier ?? ''}
			required
		/>
	</label>
	<label>
		Adgangskode
		<input name="password" type="password" autocomplete="current-password" required />
	</label>
	<button type="submit">Log ind</button>
</form>

<style>
	.error {
		color: #b00020;
		font-weight: 600;
	}
	.login {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 22rem;
	}
	.login label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-weight: 600;
	}
	.login input {
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		font-size: var(--font-size-base);
	}
	.login button {
		align-self: flex-start;
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border: none;
		border-radius: var(--radius-base);
		cursor: pointer;
	}
</style>

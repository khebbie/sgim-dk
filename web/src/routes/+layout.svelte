<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { isActive } from '$lib/domain/navigation';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let menuOpen = $state(false);
	const closeMenu = () => (menuOpen = false);
</script>

<!--
	Navigation hrefs are CMS-provided arbitrary paths (from the Navigation content
	type), not compile-time route ids, so SvelteKit's resolve() does not apply here.
-->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<svelte:head>
	<link rel="icon" href={favicon} />
	<!--
		The site answers on both sgim.dk and sgim.khebbie.dk, so without this
		search engines would see two copies of every page and split the ranking.
		sgim.dk is the canonical host (sgim-0lt.12).
	-->
	<link rel="canonical" href={`https://sgim.dk${page.url.pathname}`} />
</svelte:head>

<a class="skip-link" href="#main-content">Spring til indhold</a>

<header class="site-header">
	<a class="brand" href="/" onclick={closeMenu}>Stjær/Galten Indre Mission</a>

	<button
		class="menu-toggle"
		aria-expanded={menuOpen}
		aria-controls="primary-nav"
		onclick={() => (menuOpen = !menuOpen)}
	>
		<span class="visually-hidden">Menu</span>
		<span aria-hidden="true">☰</span>
	</button>

	<nav id="primary-nav" class="primary-nav" class:open={menuOpen} aria-label="Hovedmenu">
		<ul>
			{#each data.navigation as item (item.href)}
				<li>
					{#if item.children.length > 0}
						<details>
							<summary>{item.label}</summary>
							<ul class="submenu">
								{#each item.children as child (child.href)}
									<li>
										<a
											href={child.href}
											aria-current={isActive(child.href, page.url.pathname) ? 'page' : undefined}
											onclick={closeMenu}>{child.label}</a
										>
									</li>
								{/each}
							</ul>
						</details>
					{:else}
						<a
							href={item.href}
							aria-current={isActive(item.href, page.url.pathname) ? 'page' : undefined}
							onclick={closeMenu}>{item.label}</a
						>
					{/if}
				</li>
			{/each}
			<li class="nav-auth">
				{#if data.member}
					<a href="/members" onclick={closeMenu}>Medlem</a>
				{:else}
					<a href="/login" onclick={closeMenu}>Log ind</a>
				{/if}
			</li>
		</ul>
	</nav>
</header>

<main id="main-content" tabindex="-1">
	{@render children()}
</main>

<footer class="site-footer">
	{#if data.siteSettings}
		{@const s = data.siteSettings}
		<div class="footer-cols">
			<div>
				<p class="footer-name">{s.siteName}</p>
				{#if s.address}<p>{s.address}</p>{/if}
			</div>
			<div>
				{#if s.email}<p><a href={`mailto:${s.email}`}>{s.email}</a></p>{/if}
				{#if s.phone}<p>{s.phone}</p>{/if}
			</div>
			{#if s.facebookUrl || s.instagramUrl}
				<div class="footer-social">
					{#if s.facebookUrl}<a href={s.facebookUrl} rel="noopener">Facebook</a>{/if}
					{#if s.instagramUrl}<a href={s.instagramUrl} rel="noopener">Instagram</a>{/if}
				</div>
			{/if}
		</div>
		{#if s.copyrightText}<p class="footer-copy">{s.copyrightText}</p>{/if}
	{:else}
		<p>Stjær/Galten Indre Mission</p>
	{/if}
</footer>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-2);
		top: -3rem;
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-base);
		transition: top 0.15s ease;
		z-index: 10;
	}
	.skip-link:focus {
		top: var(--space-2);
	}

	.site-header {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		box-shadow: var(--shadow-sm);
	}
	.brand {
		font-family: var(--font-serif);
		font-size: var(--font-size-lg);
		font-weight: 600;
		text-decoration: none;
		color: var(--color-primary);
		margin-right: auto;
	}
	.brand:hover {
		color: var(--color-primary-hover);
	}

	.menu-toggle {
		display: none;
		font-size: var(--font-size-lg);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-base);
		padding: var(--space-1) var(--space-2);
		cursor: pointer;
	}

	.primary-nav ul {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin: 0;
		padding: 0;
	}
	.primary-nav a,
	.primary-nav summary {
		display: inline-block;
		padding: var(--space-1) 0;
		text-decoration: none;
		cursor: pointer;
	}
	.primary-nav a[aria-current='page'] {
		font-weight: 700;
		border-bottom: 2px solid var(--color-primary);
	}
	.submenu {
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-2) 0 0 var(--space-3);
	}

	.site-footer {
		margin-top: var(--space-5);
		padding: var(--space-4);
		border-top: 1px solid var(--color-border);
		color: var(--color-muted);
	}
	.footer-cols {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-5);
	}
	.footer-cols p {
		margin: 0 0 var(--space-1);
	}
	.footer-name {
		font-weight: 700;
		color: var(--color-text);
	}
	.footer-social {
		display: flex;
		gap: var(--space-3);
	}
	.footer-copy {
		margin-top: var(--space-3);
		font-size: 0.875rem;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	@media (max-width: 40rem) {
		.menu-toggle {
			display: inline-block;
		}
		.primary-nav {
			flex-basis: 100%;
			display: none;
		}
		.primary-nav.open {
			display: block;
		}
		.primary-nav ul {
			flex-direction: column;
		}
	}
</style>

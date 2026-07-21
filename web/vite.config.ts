import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		// Coverage thresholds encode constitution.md section 2's split:
		//   - Business logic / domain rules:   ~80%+
		//   - Infrastructure / adapters / UI:   ~60-70%
		//
		// (Coverage config is intentionally set at this root level, not inside
		// a `projects` entry — Vitest's projects/workspace mode only reads
		// `coverage` from the top-level config.)
		//
		// Today the only production code with tests is src/lib/server/**
		// (env/config loading — an infrastructure boundary), so it gets the
		// adapter-tier bar below. `config.ts` itself is excluded: it's a thin
		// composition-root that just calls `loadConfig` with the real SvelteKit
		// `$env` module, so there's nothing meaningful to unit-test beyond what
		// config-loader.test.ts already covers. Deliberately NOT a global
		// project-wide threshold: most of src/ (routes, +page.svelte, hooks)
		// has no tests yet, and a global gate would fail on that untested
		// scaffolding rather than on anything meaningful.
		//
		// As real code lands, extend `include`/`thresholds` with more globs, e.g.:
		//   - 'src/lib/domain/**'                -> ~80% (business logic, once it exists)
		//   - 'src/routes/**'                    -> ~60-70% (SvelteKit load fns/UI)
		coverage: {
			provider: 'v8',
			// text-only: avoids writing a coverage/ dir that `mise run lint`
			// (prettier/eslint over the whole tree) would then have to ignore.
			reporter: ['text'],
			include: ['src/lib/server/**'],
			exclude: ['src/lib/server/config.ts'],
			thresholds: {
				'src/lib/server/**': {
					statements: 65,
					branches: 65,
					functions: 65,
					lines: 65
				}
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});

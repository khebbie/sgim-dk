import { defineConfig } from 'vitest/config';

// Coverage thresholds encode constitution.md section 2's split:
//   - Business logic / domain rules:        ~80%+
//   - Infrastructure / adapters / UI:        ~60-70%
//
// Today the only production code with tests is src/config/** (env
// validation — an infrastructure boundary: it's the one module allowed to
// read process.env, per its own doc comment), so it gets the adapter-tier
// bar below. Deliberately NOT a global/project-wide threshold: most of
// `src/` is still Strapi scaffolding (src/admin, src/api, src/extensions)
// with no application logic or tests yet, and a global gate would fail on
// that untested boilerplate rather than on anything meaningful.
//
// As real code lands, extend `include`/`thresholds` with more globs, e.g.:
//   - 'src/domain/**'                    -> ~80% (business logic, once it exists)
//   - 'src/api/**', 'src/extensions/**'  -> ~60-70% (Strapi adapters/controllers)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // text-only: no coverage/ directory is written to disk, so there's
      // nothing for `mise run lint` (prettier/eslint over the whole tree)
      // to trip over. Numbers still print to stdout on every run.
      reporter: ['text'],
      include: ['src/config/**'],
      thresholds: {
        'src/config/**': {
          statements: 65,
          branches: 65,
          functions: 65,
          lines: 65,
        },
      },
    },
  },
});

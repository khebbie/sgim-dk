// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'build/**',
      '.cache/**',
      '.tmp/**',
      '.strapi/**',
      'node_modules/**',
      'src/admin/**',
      'src/plugins/**',
      'public/**',
      'types/**', // Strapi-generated content-type types (regenerated on build/dev)
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Config objects legitimately return `unknown`-shaped Strapi types;
      // keep this a warning rather than blocking scaffolding work.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // --- Self-correcting message convention (sgim-n25.5) ---
      // Every CUSTOM rule message below is written as a REPAIR INSTRUCTION an agent can
      // act on directly: (1) name what is wrong, (2) state the concrete fix, (3) cite the
      // constitution rule. Keep this shape for any new custom rule added here — the same
      // convention governs the dependency-cruiser rule comments in /.dependency-cruiser.cjs.

      // --- constitution.md "Follow the Sandi Metz rules" / "Replaceability" (sgim-n25.4) ---
      // Policy: "boundaries hard, size/complexity soft" — these are WARNINGS only and
      // must never fail `mise run lint` / `mise run check`. They nudge toward the
      // Sandi Metz targets (100 LOC/file, 5 LOC/method, <=4 params) without blocking work.
      'max-lines': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'warn',
        { max: 60, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'max-params': ['warn', 4],
      complexity: ['warn', 10],

      // --- constitution.md "Determinism" (sgim-n25.4) ---
      // "Inject time, randomness, and environment variables as dependencies" via
      // Clock / RandomGenerator / Config instead of reading these globals directly.
      'no-restricted-syntax': [
        'warn',
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            'constitution.md "Determinism": avoid Date.now() — inject a Clock and call clock.now() instead.',
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message:
            'constitution.md "Determinism": avoid `new Date()` with no arguments — inject a Clock instead.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'constitution.md "Determinism": avoid Math.random() — inject a RandomGenerator instead.',
        },
      ],
      'no-restricted-properties': [
        'warn',
        {
          object: 'process',
          property: 'env',
          message:
            'constitution.md "Determinism": avoid reading process.env directly — read it only inside the Config module (src/config/**) and inject a Config object elsewhere.',
        },
      ],
    },
  },
  {
    // The Config module is where process.env is legitimately read and wrapped.
    files: ['src/config/**/*.{ts,js,mjs,cjs}'],
    rules: {
      'no-restricted-properties': 'off',
    },
  }
);

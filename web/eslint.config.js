import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',

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
				{ max: 60, skipBlankLines: true, skipComments: true, IIFEs: true }
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
						'constitution.md "Determinism": avoid Date.now() — inject a Clock and call clock.now() instead.'
				},
				{
					selector: "NewExpression[callee.name='Date'][arguments.length=0]",
					message:
						'constitution.md "Determinism": avoid `new Date()` with no arguments — inject a Clock instead.'
				},
				{
					selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
					message:
						'constitution.md "Determinism": avoid Math.random() — inject a RandomGenerator instead.'
				}
			],
			'no-restricted-properties': [
				'warn',
				{
					object: 'process',
					property: 'env',
					message:
						'constitution.md "Determinism": avoid reading process.env directly — read it only inside the server Config module (src/lib/server/config*.ts) and inject a Config object elsewhere.'
				}
			]
		}
	},
	{
		// The Config module is where process.env is legitimately read and wrapped.
		files: ['src/lib/server/config*.ts'],
		rules: {
			'no-restricted-properties': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);

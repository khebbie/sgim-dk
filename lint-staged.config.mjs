// lint-staged config for the sgim.dk monorepo (pre-commit hook, sgim-n25.6).
//
// /cms and /web are independently deployable packages with their own toolchains
// and their own flat ESLint configs — we deliberately do NOT hoist their installs
// into the root (see mise.toml). So for every staged file we `cd` into the owning
// package and invoke ITS OWN prettier/eslint via `npx`, using paths relative to
// that package. This keeps each package's config (ignores, plugins, parser
// options) authoritative, same as `mise run lint` does per-package.
//
// Type-checking is intentionally NOT run here — tsc/svelte-check are whole-project,
// not per-file, so they run in `mise run check` / CI instead. This hook is meant to
// be fast: formatting + lint on staged files only.
import path from 'node:path';

const root = process.cwd();
const cmsDir = path.join(root, 'cms');
const webDir = path.join(root, 'web');

/** Build a shell-safe, space-separated list of paths relative to `dir`. */
const relList = (dir) => (files) => files.map((f) => JSON.stringify(path.relative(dir, f))).join(' ');

const cmsRel = relList(cmsDir);
const webRel = relList(webDir);

export default {
  // cms: code files -> prettier --write + eslint --fix
  'cms/**/*.{ts,tsx,js,jsx,mjs,cjs}': (files) => {
    const list = cmsRel(files);
    return [
      `bash -c 'cd cms && npx prettier --write ${list} && npx eslint --fix --no-warn-ignored ${list}'`,
    ];
  },
  // cms: data/doc files -> prettier only (no eslint target for these)
  'cms/**/*.{json,md,yml,yaml}': (files) => {
    const list = cmsRel(files);
    return [`bash -c 'cd cms && npx prettier --write ${list}'`];
  },

  // web: code files (incl. Svelte) -> prettier --write + eslint --fix
  'web/**/*.{ts,js,svelte,mjs,cjs}': (files) => {
    const list = webRel(files);
    return [
      `bash -c 'cd web && npx prettier --write ${list} && npx eslint --fix --no-warn-ignored ${list}'`,
    ];
  },
  // web: data/doc files -> prettier only
  'web/**/*.{json,md,yml,yaml}': (files) => {
    const list = webRel(files);
    return [`bash -c 'cd web && npx prettier --write ${list}'`];
  },
};

/**
 * Architecture-fitness sensor (sgim-n25.3).
 *
 * Encodes the ports & adapters boundary rules from constitution.md
 * ("Replaceability", "External Service Calls", "Controlled Side Effects")
 * as build-breaking dependency-cruiser rules.
 *
 * Run from the repo root:
 *   npx depcruise --config .dependency-cruiser.cjs cms/src web/src
 * (wired as the root `npm run boundaries` script)
 *
 * Scope note: /cms and /web are independently deployable apps with their own
 * node_modules (see AGENTS.md "Running the Checks (mise)"). This config is
 * invoked once per test-run but pointed at both trees so cross-tree rules
 * (e.g. "web must never import @strapi/*") are checked in one pass; each
 * tree still resolves its imports against its own node_modules because
 * dependency-cruiser's resolver walks up from each source file's directory.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-strapi-vendor-in-web',
      severity: 'error',
      comment:
        "constitution.md 'Replaceability': avoid vendor-specific APIs — wrap them in a generic " +
        'interface. web/src must depend only on the generic ContentSource port, never on ' +
        '@strapi/* shapes directly. FIX: move this import behind the Strapi adapter at ' +
        'web/src/lib/server/cms/** (see sgim-x60.3) and consume the ContentSource port from ' +
        'here instead.',
      from: {
        path: '^web/src',
        pathNot: '^web/src/lib/server/cms/',
      },
      to: {
        path: '(^|/)node_modules/@strapi/|^@strapi/',
      },
    },
    {
      name: 'web-domain-purity',
      severity: 'error',
      comment:
        "constitution.md 'Controlled Side Effects' / 'Ports and adapters': core domain logic " +
        'must be pure and must not depend on framework, adapter, or UI layers. ' +
        'web/src/lib/domain/** must not import SvelteKit framework modules ($app/*, ' +
        '@sveltejs/*), vendor SDKs (@strapi/*), or the routes/adapter layers directly. ' +
        'FIX: pass the data/behavior the domain needs in as a plain parameter or injected ' +
        'port from the calling adapter/route instead of importing the framework from within ' +
        'the domain module.',
      from: {
        path: '^web/src/lib/domain/',
      },
      to: {
        path:
          '^\\$app/|(^|/)node_modules/@sveltejs/|^@sveltejs/|(^|/)node_modules/@strapi/|^@strapi/|^web/src/routes/|^web/src/lib/server/',
      },
    },
    {
      name: 'cms-domain-purity',
      severity: 'error',
      comment:
        "constitution.md 'Controlled Side Effects' / 'Ports and adapters': core domain logic " +
        'must be pure and must not depend on framework, adapter, or UI layers. ' +
        'cms/src/domain/** must not import the Strapi SDK (@strapi/*) or reach into the ' +
        "Strapi HTTP/route layer (cms/src/api/**) or admin UI (cms/src/admin/**) directly. " +
        'FIX: express the dependency as a plain function parameter or injected port, and let ' +
        'the api/controller/service layer call into the domain — never the reverse.',
      from: {
        path: '^cms/src/domain/',
      },
      to: {
        path:
          '(^|/)node_modules/@strapi/|^@strapi/|^cms/src/api/|^cms/src/admin/|^cms/src/extensions/',
      },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        "constitution.md 'Isolation' / 'Replaceability': circular module dependencies make " +
        'components impossible to understand or replace independently. FIX: break the cycle ' +
        'by extracting the shared piece both modules depend on into a third module, or by ' +
        'inverting one of the dependencies behind an interface.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment:
        "constitution.md 'Incremental Improvement': a module nothing imports and that imports " +
        'nothing else is either dead code or missing its wiring. FIX: delete it if unused, or ' +
        'confirm it is a genuine entry point (route, config, test) and add it to the ' +
        "no-orphans exclusion if so.",
      from: {
        orphan: true,
        pathNot: [
          '\\.(test|spec)\\.[jt]sx?$',
          '(^|/)index\\.[jt]sx?$',
          '\\.d\\.ts$',
          '^cms/src/index\\.ts$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    exclude: {
      path: [
        '(^|/)node_modules/',
        '(^|/)\\.svelte-kit/',
        '(^|/)\\.strapi/',
        '(^|/)\\.cache/',
        '(^|/)build/',
        '(^|/)dist/',
        '(^|/)\\.git/',
        '\\.(test|spec)\\.[jt]sx?$',
      ],
    },
    tsPreCompilationDeps: true,
    combinedDependencies: false,
  },
};

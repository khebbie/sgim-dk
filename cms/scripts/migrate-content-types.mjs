/**
 * One-shot migration (sgim-pgx.15): the content types were created as bare,
 * malformed schema.json files under src/content-types/ (singularName/pluralName
 * at the top level, no `info` block, no routes) so Strapi never registered them.
 *
 * This regenerates each as a proper Strapi v5 API under src/api/<singular>/:
 *   content-types/<singular>/schema.json  (with an `info` block)
 *   routes/<singular>.ts | controllers/<singular>.ts | services/<singular>.ts
 *
 * Idempotent: safe to re-run (overwrites generated files). Reads the OLD schemas
 * from src/content-types/ as the source of truth for fields; run the companion
 * cleanup to delete src/content-types/ afterwards.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cmsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcOld = join(cmsRoot, 'src', 'content-types');
const apiRoot = join(cmsRoot, 'src', 'api');

// Auto-managed by Strapi — must NOT be explicit attributes.
const AUTO_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'publishedAt',
  'id',
  'documentId',
  'locale',
  'localizations',
]);

function cleanAttributes(attributes) {
  const cleaned = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (AUTO_FIELDS.has(key)) continue;
    // Drop inverse (oneToMany) relations to avoid bidirectional-link fragility;
    // the owning manyToOne side is kept and is queryable in reverse via filters.
    if (value.type === 'relation' && value.relation === 'oneToMany') continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function buildSchema(old) {
  // Strapi requires pluralName !== singularName (even for single types).
  const pluralName = old.pluralName === old.singularName ? `${old.pluralName}s` : old.pluralName;
  return {
    kind: old.kind,
    collectionName: undefined, // let Strapi derive from info.pluralName
    info: {
      singularName: old.singularName,
      pluralName,
      displayName: old.displayName,
      description: old.description ?? '',
    },
    options: { draftAndPublish: false },
    pluginOptions: {},
    attributes: cleanAttributes(old.attributes),
  };
}

const factory = (kind, uid) =>
  `import { factories } from '@strapi/strapi';\n\nexport default factories.createCore${kind}('${uid}');\n`;

function writeApi(old) {
  const api = old.singularName; // apiName === singularName
  const uid = `api::${api}.${api}`;
  const base = join(apiRoot, api);
  mkdirSync(join(base, 'content-types', api), { recursive: true });
  mkdirSync(join(base, 'routes'), { recursive: true });
  mkdirSync(join(base, 'controllers'), { recursive: true });
  mkdirSync(join(base, 'services'), { recursive: true });

  const schema = buildSchema(old);
  writeFileSync(
    join(base, 'content-types', api, 'schema.json'),
    JSON.stringify(schema, null, 2) + '\n'
  );
  writeFileSync(join(base, 'routes', `${api}.ts`), factory('Router', uid));
  writeFileSync(join(base, 'controllers', `${api}.ts`), factory('Controller', uid));
  writeFileSync(join(base, 'services', `${api}.ts`), factory('Service', uid));
  return api;
}

const dirs = readdirSync(srcOld, { withFileTypes: true }).filter((d) => d.isDirectory());
const generated = dirs.map((d) => {
  const old = JSON.parse(readFileSync(join(srcOld, d.name, 'schema.json'), 'utf8'));
  return writeApi(old);
});
console.log(`Generated ${generated.length} APIs: ${generated.join(', ')}`);

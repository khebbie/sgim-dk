/**
 * Bootstrap public read permissions (sgim-pgx.15).
 *
 * The website reads public content anonymously, so the Users & Permissions
 * "public" role needs find/findOne on the public content types. Idempotent:
 * only creates a permission if it isn't already present. Runs on every start.
 */
import type { Core } from '@strapi/strapi';

// Single types expose only `find`; collection types expose `find` + `findOne`.
const PUBLIC_READ_ACTIONS: Record<string, string[]> = {
  'api::aktuelt.aktuelt': ['find'],
  'api::site-setting.site-setting': ['find'],
  'api::event.event': ['find', 'findOne'],
  'api::club.club': ['find', 'findOne'],
  'api::navigation.navigation': ['find', 'findOne'],
  'api::static-page.static-page': ['find', 'findOne'],
};

export async function bootstrapPublicPermissions(strapi: Core.Strapi): Promise<void> {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) {
    strapi.log.warn('Public role not found; skipping public permission bootstrap');
    return;
  }

  let granted = 0;
  for (const [uid, actions] of Object.entries(PUBLIC_READ_ACTIONS)) {
    for (const action of actions) {
      granted += await grant(strapi, `${uid}.${action}`, publicRole.id);
    }
  }
  strapi.log.info(
    JSON.stringify({
      operation: 'bootstrap-public-permissions',
      granted,
      message: 'public read permissions ensured',
    })
  );
}

/** Ensures one permission exists for the public role; returns 1 if newly created. */
async function grant(strapi: Core.Strapi, action: string, roleId: string): Promise<number> {
  const existing = await strapi.db
    .query('plugin::users-permissions.permission')
    .findOne({ where: { action, role: roleId } });
  if (existing) return 0;
  await strapi.db
    .query('plugin::users-permissions.permission')
    .create({ data: { action, role: roleId } });
  return 1;
}

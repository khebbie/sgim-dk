import type { Core } from '@strapi/strapi';
import { bootstrapAdmin } from './config/bootstrap-admin';
import { configureMemberAuth } from './config/member-auth';
import { bootstrapPublicPermissions } from './config/bootstrap-permissions';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Bootstrap admin user (sgim-pgx.14)
    // Idempotent: only creates if not exists, only when both env vars are set
    await bootstrapAdmin(strapi);

    // Configure member authentication (sgim-pgx.9)
    // Disables public registration, creates Authenticated Member role with limited permissions
    await configureMemberAuth(strapi);

    // Bootstrap public read permissions for the website (sgim-pgx.15). Idempotent.
    await bootstrapPublicPermissions(strapi);
  },
};

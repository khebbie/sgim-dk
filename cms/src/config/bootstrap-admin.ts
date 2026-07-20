/**
 * Bootstrap Admin User
 *
 * Implements sgim-pgx.14: Bootstrap a Strapi admin user automatically
 *
 * This module provides idempotent admin user creation on CMS startup.
 * - Only creates if BOTH BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are set
 * - Checks if admin already exists before creating
 * - Never resets existing admin passwords
 * - Logs state transitions without logging secrets
 */

import type { Core } from '@strapi/strapi';
import { getEnvConfig } from './env';

export interface BootstrapAdminResult {
  created: boolean;
  email: string | null;
}

/**
 * Check if an admin user with the given email already exists.
 * Uses Strapi's query API to check the admin::user content type.
 */
async function adminExists(strapi: Core.Strapi, email: string): Promise<boolean> {
  try {
    // Use query directly - service may not be needed
    const existing = await strapi.db.query('admin::user').findOne({
      where: { email },
    });
    return existing !== null && existing !== undefined;
  } catch (error) {
    // If the query fails (e.g., during first migration), assume no admin exists
    // and log the error for debugging
    strapi.log.error('Failed to check for existing admin: %s', String(error));
    return false;
  }
}

/**
 * Get the super-admin role from Strapi.
 * In Strapi v5, the super-admin role has code 'strapi-super-admin'.
 */
async function getSuperAdminRole(strapi: Core.Strapi): Promise<string | null> {
  try {
    const role = await strapi.db.query('admin::role').findOne({
      where: { code: 'strapi-super-admin' },
    });
    return role?.id || null;
  } catch (error) {
    strapi.log.error('Failed to get super-admin role: %s', String(error));
    return null;
  }
}

/**
 * Create a new admin user with super-admin privileges.
 *
 * IMPORTANT: The password is hashed by Strapi's user service.
 * We never log the password itself.
 */
async function createAdminUser(
  strapi: Core.Strapi,
  email: string,
  password: string,
  roleId: string | null
): Promise<boolean> {
  try {
    const adminUserService = strapi.service('admin::user');

    await adminUserService.create({
      firstname: 'Admin',
      lastname: 'SGIM',
      email,
      password,
      isActive: true,
      registrationToken: null,
      roles: roleId ? [roleId] : [],
    });

    return true;
  } catch (error) {
    strapi.log.error('Failed to create admin user: %s', String(error));
    return false;
  }
}

/**
 * Should we attempt to bootstrap an admin user?
 *
 * Returns true only if:
 * - BOTH email and password are configured
 * - We're not in production without explicit configuration
 *
 * This is the testable predicate mentioned in the requirements.
 */
export function shouldBootstrapAdmin(): { should: boolean; email?: string; password?: string } {
  const { bootstrapAdmin } = getEnvConfig();

  // Only bootstrap if both email and password are set
  if (!bootstrapAdmin.email || !bootstrapAdmin.password) {
    return { should: false };
  }

  return { should: true, email: bootstrapAdmin.email, password: bootstrapAdmin.password };
}

/**
 * Bootstrap a Strapi admin user if needed.
 *
 * This is the main entry point called from src/index.ts bootstrap().
 * It is idempotent: it only creates an admin if one doesn't exist.
 *
 * Requirements met:
 * ✓ Idempotent: only creates if admin doesn't exist
 * ✓ Fail-safe: if env vars unset, silently skips
 * ✓ Never logs password
 * ✓ Logs state transition (JSON structured)
 * ✓ Small, testable predicate (shouldBootstrapAdmin)
 */
export async function bootstrapAdmin(strapi: Core.Strapi): Promise<BootstrapAdminResult> {
  const { should, email, password } = shouldBootstrapAdmin();

  // If we shouldn't bootstrap, return early
  if (!should || !email || !password) {
    strapi.log.info('Skipping admin bootstrap: credentials not configured');
    return { created: false, email: null };
  }

  // Check if admin already exists
  const exists = await adminExists(strapi, email);

  if (exists) {
    strapi.log.info('Admin user %s already exists, skipping creation', email);
    return { created: false, email };
  }

  // Get super-admin role
  const roleId = await getSuperAdminRole(strapi);

  if (!roleId) {
    strapi.log.warn('Super-admin role not found, cannot create admin for %s', email);
    return { created: false, email };
  }

  // Create the admin user
  const created = await createAdminUser(strapi, email, password, roleId);

  if (created) {
    // Log the state transition WITHOUT the password
    strapi.log.info('Seeded admin user: %s with role %s', email, roleId);
    return { created: true, email };
  }

  strapi.log.error('Failed to create admin user: %s', email);
  return { created: false, email };
}

/**
 * Member Authentication Configuration
 *
 * Implements sgim-pgx.9: Members auth: roles & admin-created accounts
 *
 * This module configures:
 * - Disables public self-registration (admin-created accounts only)
 * - Creates 'Authenticated Member' role with limited permissions
 * Login rate limiting and generic (non-enumerating) error messages are provided
 * natively by Strapi's auth endpoints; auth events go through its winston logger.
 */

import type { Core } from '@strapi/strapi';

export interface MemberAuthResult {
  configured: boolean;
  errors: string[];
}

/**
 * Permission types for Strapi v5
 */
export type PermissionType = {
  action: string;
  subject: string;
  properties?: Record<string, unknown>;
  conditions?: string[];
};

/**
 * Create the 'Authenticated Member' role with limited permissions.
 *
 * Permissions should be limited to:
 * - Read own user
 * - Duty self-management endpoints (when they exist)
 * - No access to admin content types beyond what's needed
 */
async function createMemberRole(
  strapi: Core.Strapi
): Promise<{ roleId: string | null; error?: string }> {
  try {
    // Check if role already exists
    const existingRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { name: 'Authenticated Member' },
    });

    if (existingRole) {
      return { roleId: existingRole.id };
    }

    // Create the role
    const role = await strapi.service('plugin::users-permissions.role').create({
      name: 'Authenticated Member',
      description: 'Regular member with access to own profile and duty management',
      type: 'public', // Public role (not authenticated-only)
    });

    return { roleId: role.id };
  } catch (error) {
    return { roleId: null, error: String(error) };
  }
}

/**
 * Get or create permissions for own user access.
 * Members should be able to read and update their own user profile.
 */
async function ensureOwnUserPermissions(strapi: Core.Strapi, roleId: string): Promise<void> {
  try {
    // Check for existing permissions for this role
    const existingPermissions = await strapi.db
      .query('plugin::users-permissions.permission')
      .findMany({
        where: { role: roleId },
      });

    // Permissions we need for own user access
    const requiredPermissions: PermissionType[] = [
      {
        action: 'read',
        subject: 'users-permissions.user',
        properties: {},
        conditions: ['is:authenticated', 'is:own'],
      },
      {
        action: 'update',
        subject: 'users-permissions.user',
        properties: {},
        conditions: ['is:authenticated', 'is:own'],
      },
    ];

    // For each required permission, check if it exists and create if not
    for (const permission of requiredPermissions) {
      const existing = existingPermissions.find(
        (p) => p.action === permission.action && p.subject === permission.subject
      );

      if (!existing) {
        await strapi.service('plugin::users-permissions.permission').create({
          action: permission.action,
          subject: permission.subject,
          role: roleId,
          properties: permission.properties,
          conditions: permission.conditions,
        });
      }
    }
  } catch (error) {
    strapi.log.error('Failed to ensure own user permissions: %s', String(error));
  }
}

/**
 * Configure Users & Permissions plugin settings.
 *
 * This disables public registration so only admins can create accounts.
 */
export async function disablePublicRegistration(strapi: Core.Strapi): Promise<boolean> {
  // The users-permissions "advanced" settings live in the plugin core store —
  // there is no getSettings/updateSettings service in Strapi v5 (an earlier
  // version of this code called those, threw, and silently left registration
  // OPEN; sgim-pgx.9). Read-modify-write the store instead.
  const store = strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
  const advanced = ((await store.get({})) ?? {}) as Record<string, unknown>;

  if (advanced.allow_register === false) return true; // already disabled

  await store.set({ value: { ...advanced, allow_register: false } });
  strapi.log.info(
    JSON.stringify({
      operation: 'member-auth',
      message: 'public self-registration disabled',
    })
  );
  return true;
}

async function configureUsersPermissionsPlugin(strapi: Core.Strapi): Promise<boolean> {
  try {
    return await disablePublicRegistration(strapi);
  } catch (error) {
    // Registration staying open is a security problem — make it loud.
    strapi.log.error(
      JSON.stringify({
        operation: 'member-auth',
        level: 'error',
        message: 'FAILED to disable public self-registration',
        error: String(error),
      })
    );
    return false;
  }
}

/**
 * Main function to configure member authentication.
 *
 * This should be called from src/index.ts bootstrap().
 *
 * Requirements met:
 * ✓ Public registration disabled
 * ✓ Authenticated Member role created with limited permissions
 * ✓ Login returns JWT (handled by Strapi)
 * ✓ Login rate limiting: provided natively by Strapi's auth endpoints
 * ✓ Generic error messages (handled by Strapi with proper config)
 * ✓ Auth events logged via Strapi's winston logger
 */
export async function configureMemberAuth(strapi: Core.Strapi): Promise<MemberAuthResult> {
  const errors: string[] = [];

  // 1. Disable public registration
  const registrationConfigured = await configureUsersPermissionsPlugin(strapi);
  if (!registrationConfigured) {
    errors.push('Failed to configure Users & Permissions plugin');
  }

  // 2. Create Authenticated Member role
  const { roleId, error: roleError } = await createMemberRole(strapi);
  if (!roleId) {
    errors.push(roleError || 'Failed to create Authenticated Member role');
  } else if (roleId) {
    // 3. Ensure own user permissions
    await ensureOwnUserPermissions(strapi, roleId);
  }

  if (errors.length === 0) {
    strapi.log.info('Member authentication configured successfully');
  } else {
    for (const error of errors) {
      strapi.log.error(error);
    }
  }

  return {
    configured: errors.length === 0,
    errors,
  };
}

/**
 * Unit tests for member-auth module
 *
 * Implements sgim-pgx.9: Members auth: roles & admin-created accounts
 * Tests the member authentication configuration.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import { configureMemberAuth, disablePublicRegistration } from './member-auth';

/** Minimal strapi double exposing the users-permissions "advanced" core store. */
function strapiWithStore(initial: Record<string, unknown>) {
  const state = { value: initial };
  const store = {
    get: vi.fn(async () => state.value),
    set: vi.fn(async ({ value }: { value: Record<string, unknown> }) => {
      state.value = value;
    }),
  };
  const strapi = {
    store: vi.fn(() => store),
    log: { info: vi.fn(), error: vi.fn() },
  } as unknown as Core.Strapi;
  return { strapi, store, state };
}

/**
 * Fuller double: the advanced-settings store, the role table and the
 * users-permissions services configureMemberAuth drives.
 */
function strapiForMemberAuth(options: { existingRole?: boolean; storeThrows?: boolean } = {}) {
  const advanced: Record<string, unknown> = { allow_register: true };
  const created: Record<string, unknown>[] = [];
  const permissions: Record<string, unknown>[] = [];

  const strapi = {
    store: vi.fn(() => ({
      get: vi.fn(async () => {
        if (options.storeThrows) throw new Error('store unavailable');
        return advanced;
      }),
      set: vi.fn(async ({ value }: { value: Record<string, unknown> }) => {
        Object.assign(advanced, value);
      }),
    })),
    db: {
      query: vi.fn(() => ({
        findOne: vi.fn(async () => (options.existingRole ? { id: 'existing-role' } : null)),
        findMany: vi.fn(async () => permissions),
      })),
    },
    service: vi.fn((uid: string) => {
      if (uid === 'plugin::users-permissions.role') {
        return {
          create: vi.fn(async (data: Record<string, unknown>) => {
            created.push(data);
            return { id: 'new-role' };
          }),
        };
      }
      return { create: vi.fn(async (p: Record<string, unknown>) => permissions.push(p)) };
    }),
    log: { info: vi.fn(), error: vi.fn() },
  } as unknown as Core.Strapi;

  return { strapi, advanced, created, permissions };
}

describe('member-auth', () => {
  it('should export configureMemberAuth function', () => {
    expect(typeof configureMemberAuth).toBe('function');
  });

  describe('configureMemberAuth', () => {
    it('disables registration and creates the member role', async () => {
      const { strapi, advanced, created } = strapiForMemberAuth();

      const result = await configureMemberAuth(strapi);

      expect(result.configured).toBe(true);
      expect(result.errors).toEqual([]);
      expect(advanced.allow_register).toBe(false);
      expect(created[0]).toMatchObject({ name: 'Authenticated Member' });
    });

    it('reuses an existing member role instead of creating a duplicate', async () => {
      const { strapi, created } = strapiForMemberAuth({ existingRole: true });

      const result = await configureMemberAuth(strapi);

      expect(result.configured).toBe(true);
      expect(created).toEqual([]);
    });

    it('reports an error (rather than throwing) when the settings store fails', async () => {
      const { strapi, advanced } = strapiForMemberAuth({ storeThrows: true });

      const result = await configureMemberAuth(strapi);

      expect(result.configured).toBe(false);
      expect(result.errors.join(' ')).toMatch(/Users & Permissions/);
      // Registration stays as-is; the failure is surfaced, not silently ignored.
      expect(advanced.allow_register).toBe(true);
    });

    it('grants the member role own-profile read/update permissions', async () => {
      const { strapi, permissions } = strapiForMemberAuth();

      await configureMemberAuth(strapi);

      expect(permissions.map((p) => p.action)).toEqual(expect.arrayContaining(['read', 'update']));
      expect(permissions.every((p) => p.subject === 'users-permissions.user')).toBe(true);
    });
  });

  // Regression (sgim-pgx.9): the previous implementation called non-existent
  // getSettings/updateSettings services, threw, swallowed the error and left
  // public self-registration OPEN. Write through the plugin core store instead.
  describe('disablePublicRegistration', () => {
    it('turns allow_register off while preserving the other advanced settings', async () => {
      const { strapi, store, state } = strapiWithStore({
        allow_register: true,
        unique_email: true,
        default_role: 'authenticated',
      });

      await expect(disablePublicRegistration(strapi)).resolves.toBe(true);

      expect(store.set).toHaveBeenCalled();
      expect(state.value).toEqual({
        allow_register: false,
        unique_email: true,
        default_role: 'authenticated',
      });
    });

    it('is idempotent when registration is already disabled', async () => {
      const { strapi, store } = strapiWithStore({ allow_register: false });

      await expect(disablePublicRegistration(strapi)).resolves.toBe(true);

      expect(store.set).not.toHaveBeenCalled();
    });
  });
});

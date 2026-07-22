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

describe('member-auth', () => {
  it('should export configureMemberAuth function', () => {
    expect(typeof configureMemberAuth).toBe('function');
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

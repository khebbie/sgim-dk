/**
 * Unit tests for the permission bootstrap (sgim-pgx.15 / sgim-n25.7).
 *
 * This module encodes a security boundary: which content the ANONYMOUS public
 * role may read, and which extra actions an authenticated member gets. Those
 * grants are asserted explicitly so a careless edit (e.g. granting the public
 * role duty-assignment access) fails the build.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import { bootstrapPublicPermissions } from './bootstrap-permissions';

type Row = { action: string; role: string };

/**
 * Strapi double backed by an in-memory permission table, so we can assert on
 * exactly which (action, role) pairs the bootstrap creates.
 */
function strapiWithRoles(options: { existing?: Row[]; authRole?: boolean } = {}) {
  const created: Row[] = [];
  const existing = options.existing ?? [];
  const roles = [
    { id: 'public-role', type: 'public' },
    ...(options.authRole === false ? [] : [{ id: 'auth-role', type: 'authenticated' }]),
  ];

  const query = (uid: string) => {
    if (uid === 'plugin::users-permissions.role') {
      return {
        findOne: vi.fn(async ({ where }: { where: { type: string } }) =>
          roles.find((r) => r.type === where.type)
        ),
      };
    }
    return {
      findOne: vi.fn(async ({ where }: { where: Row }) =>
        [...existing, ...created].find((p) => p.action === where.action && p.role === where.role)
      ),
      create: vi.fn(async ({ data }: { data: Row }) => {
        created.push(data);
        return data;
      }),
    };
  };

  const strapi = {
    db: { query: vi.fn(query) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as unknown as Core.Strapi;

  return { strapi, created };
}

const actionsFor = (created: Row[], role: string) =>
  created.filter((p) => p.role === role).map((p) => p.action);

describe('bootstrapPublicPermissions', () => {
  it('grants the public role read-only access to the website content types', async () => {
    const { strapi, created } = strapiWithRoles();

    await bootstrapPublicPermissions(strapi);

    const publicActions = actionsFor(created, 'public-role');
    expect(publicActions).toContain('api::event.event.find');
    expect(publicActions).toContain('api::static-page.static-page.findOne');
    expect(publicActions).toContain('api::site-setting.site-setting.find');
    // Duty categories are reference data the site needs to derive the roster.
    expect(publicActions).toContain('api::duty-category.duty-category.find');
  });

  it('never grants the public role write access or the duty assignments', async () => {
    const { strapi, created } = strapiWithRoles();

    await bootstrapPublicPermissions(strapi);

    const publicActions = actionsFor(created, 'public-role');
    expect(publicActions.every((a) => a.endsWith('.find') || a.endsWith('.findOne'))).toBe(true);
    expect(publicActions.some((a) => a.startsWith('api::duty-assignment'))).toBe(false);
  });

  it('grants members the duty self-management actions', async () => {
    const { strapi, created } = strapiWithRoles();

    await bootstrapPublicPermissions(strapi);

    expect(actionsFor(created, 'auth-role')).toEqual(
      expect.arrayContaining([
        'api::duty-assignment.duty-assignment.find',
        'api::duty-assignment.duty-assignment.claim',
        'api::duty-assignment.duty-assignment.release',
      ])
    );
  });

  it('is idempotent — existing permissions are not recreated', async () => {
    const first = strapiWithRoles();
    await bootstrapPublicPermissions(first.strapi);

    const second = strapiWithRoles({ existing: first.created });
    await bootstrapPublicPermissions(second.strapi);

    expect(second.created).toEqual([]);
  });

  it('skips the member grants when the authenticated role is missing', async () => {
    const { strapi, created } = strapiWithRoles({ authRole: false });

    await bootstrapPublicPermissions(strapi);

    expect(actionsFor(created, 'public-role').length).toBeGreaterThan(0);
    expect(actionsFor(created, 'auth-role')).toEqual([]);
  });
});

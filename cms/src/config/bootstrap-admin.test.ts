/**
 * Unit tests for bootstrap-admin module
 *
 * Implements sgim-pgx.14: Bootstrap a Strapi admin user automatically
 * Tests the testable predicate (shouldBootstrapAdmin) and edge cases.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { Core } from '@strapi/strapi';
import { shouldBootstrapAdmin, bootstrapAdmin } from './bootstrap-admin';
import { getEnvConfig, resetEnvConfigCache } from './env';

const REQUIRED_VARS = {
  APP_KEYS: 'key-one,key-two',
  API_TOKEN_SALT: 'salt',
  ADMIN_JWT_SECRET: 'admin-secret',
  JWT_SECRET: 'jwt-secret',
  TRANSFER_TOKEN_SALT: 'transfer-salt',
  ENCRYPTION_KEY: 'encryption-key',
  DATABASE_NAME: 'sgim',
  DATABASE_USERNAME: 'strapi',
  DATABASE_PASSWORD: 'strapi',
} as const;

describe('bootstrap-admin', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvConfigCache();
    process.env = { ...originalEnv, ...REQUIRED_VARS };
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('shouldBootstrapAdmin', () => {
    it('should return should:false when both env vars are unset', () => {
      const result = shouldBootstrapAdmin();
      expect(result.should).toBe(false);
      expect(result.email).toBeUndefined();
      expect(result.password).toBeUndefined();
    });

    it('should throw when only BOOTSTRAP_ADMIN_EMAIL is set', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';

      expect(() => shouldBootstrapAdmin()).toThrow(
        'Invalid environment variable "BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD": both must be set together or both unset; BOOTSTRAP_ADMIN_PASSWORD is missing'
      );
    });

    it('should throw when only BOOTSTRAP_ADMIN_PASSWORD is set', () => {
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'password123';

      expect(() => shouldBootstrapAdmin()).toThrow(
        'Invalid environment variable "BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD": both must be set together or both unset; BOOTSTRAP_ADMIN_EMAIL is missing'
      );
    });

    it('should return should:false when both env vars are empty strings', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = '';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = '';

      const result = shouldBootstrapAdmin();
      expect(result.should).toBe(false);
      expect(result.email).toBeUndefined();
      expect(result.password).toBeUndefined();
    });

    it('should return should:true with email and password when both are set', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@sgim.dk';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'secure-password-123';

      const result = shouldBootstrapAdmin();
      expect(result.should).toBe(true);
      expect(result.email).toBe('admin@sgim.dk');
      expect(result.password).toBe('secure-password-123');
    });

    it('should handle whitespace in values', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = '  admin@sgim.dk  ';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = '  password123  ';

      const result = shouldBootstrapAdmin();
      expect(result.should).toBe(true);
      expect(result.email).toBe('  admin@sgim.dk  ');
      expect(result.password).toBe('  password123  ');
    });
  });

  describe('getEnvConfig bootstrapAdmin', () => {
    it('should include bootstrapAdmin in config when both vars are set', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'password123';

      const config = getEnvConfig();
      expect(config.bootstrapAdmin).toBeDefined();
      expect(config.bootstrapAdmin.email).toBe('admin@test.com');
      expect(config.bootstrapAdmin.password).toBe('password123');
    });

    it('should include bootstrapAdmin with undefined values when vars are not set', () => {
      const config = getEnvConfig();
      expect(config.bootstrapAdmin).toBeDefined();
      expect(config.bootstrapAdmin.email).toBeUndefined();
      expect(config.bootstrapAdmin.password).toBeUndefined();
    });

    it('should cache the config after first call', () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'password123';

      getEnvConfig();

      // Change env after first call
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'new-admin@test.com';

      const config2 = getEnvConfig();

      // Should return cached config
      expect(config2.bootstrapAdmin.email).toBe('admin@test.com');
    });
  });

  /**
   * bootstrapAdmin drives Strapi's admin tables. The double records what it
   * would create so we can assert idempotency and that no password is logged.
   */
  function strapiForAdmin(options: { adminExists?: boolean; superAdminRole?: boolean } = {}) {
    const created: Record<string, unknown>[] = [];
    const logs: string[] = [];
    const log = (msg: string, ...rest: unknown[]) => logs.push([msg, ...rest].join(' '));

    const strapi = {
      db: {
        query: vi.fn((uid: string) => ({
          findOne: vi.fn(async () => {
            if (uid === 'admin::user') return options.adminExists ? { id: 1 } : null;
            return options.superAdminRole === false ? null : { id: 'super-admin-role' };
          }),
        })),
      },
      service: vi.fn(() => ({
        create: vi.fn(async (data: Record<string, unknown>) => {
          created.push(data);
          return data;
        }),
      })),
      log: { info: vi.fn(log), warn: vi.fn(log), error: vi.fn(log) },
    } as unknown as Core.Strapi;

    return { strapi, created, logs };
  }

  describe('bootstrapAdmin', () => {
    it('skips when credentials are not configured', async () => {
      const { strapi, created } = strapiForAdmin();

      await expect(bootstrapAdmin(strapi)).resolves.toEqual({ created: false, email: null });
      expect(created).toEqual([]);
    });

    it('creates a super-admin when configured and none exists', async () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'sekret-passw0rd';
      resetEnvConfigCache();
      const { strapi, created, logs } = strapiForAdmin();

      const result = await bootstrapAdmin(strapi);

      expect(result).toEqual({ created: true, email: 'admin@test.com' });
      expect(created[0]).toMatchObject({ email: 'admin@test.com', roles: ['super-admin-role'] });
      // The password must never reach the logs.
      expect(logs.join(' ')).not.toContain('sekret-passw0rd');
    });

    it('is idempotent when the admin already exists', async () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'sekret-passw0rd';
      resetEnvConfigCache();
      const { strapi, created } = strapiForAdmin({ adminExists: true });

      const result = await bootstrapAdmin(strapi);

      expect(result).toEqual({ created: false, email: 'admin@test.com' });
      expect(created).toEqual([]);
    });

    it('does not create an admin when the super-admin role is missing', async () => {
      process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin@test.com';
      process.env.BOOTSTRAP_ADMIN_PASSWORD = 'sekret-passw0rd';
      resetEnvConfigCache();
      const { strapi, created } = strapiForAdmin({ superAdminRole: false });

      const result = await bootstrapAdmin(strapi);

      expect(result).toEqual({ created: false, email: 'admin@test.com' });
      expect(created).toEqual([]);
    });
  });
});

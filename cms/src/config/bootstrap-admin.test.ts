/**
 * Unit tests for bootstrap-admin module
 *
 * Implements sgim-pgx.14: Bootstrap a Strapi admin user automatically
 * Tests the testable predicate (shouldBootstrapAdmin) and edge cases.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { shouldBootstrapAdmin } from './bootstrap-admin';
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
});

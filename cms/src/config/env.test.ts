import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getEnvConfig, resetEnvConfigCache, MissingEnvVarError } from './env';

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

describe('getEnvConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEnvConfigCache();
    process.env = { ...originalEnv, ...REQUIRED_VARS };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('builds a config object from valid environment variables', () => {
    const config = getEnvConfig();

    expect(config.database).toMatchObject({
      client: 'postgres',
      name: 'sgim',
      username: 'strapi',
      password: 'strapi',
      host: 'localhost',
      port: 5432,
    });
    expect(config.secrets.appKeys).toEqual(['key-one', 'key-two']);
    expect(config.server).toEqual({ host: '0.0.0.0', port: 1337 });
  });

  it('applies HOST/PORT overrides when present', () => {
    process.env.HOST = '127.0.0.1';
    process.env.PORT = '4000';

    expect(getEnvConfig().server).toEqual({ host: '127.0.0.1', port: 4000 });
  });

  it.each(Object.keys(REQUIRED_VARS))('fails fast when %s is missing', (missingVar) => {
    delete process.env[missingVar];

    expect(() => getEnvConfig()).toThrow(MissingEnvVarError);
  });

  it('rejects a non-integer PORT with a clear error', () => {
    process.env.PORT = 'not-a-number';

    expect(() => getEnvConfig()).toThrow(/PORT/);
  });

  it('caches the result across calls', () => {
    const first = getEnvConfig();
    const second = getEnvConfig();

    expect(first).toBe(second);
  });
});

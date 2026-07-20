/**
 * Centralized environment configuration.
 *
 * This is the ONLY module in the codebase allowed to read `process.env`
 * directly. Strapi's `config/*.ts` files (which Strapi itself requires to
 * live at that location) and any application code must obtain settings via
 * `getEnvConfig()` instead of reaching into `process.env` themselves.
 *
 * Every required variable is validated eagerly the first time
 * `getEnvConfig()` is called, so a missing/malformed value fails fast with
 * a clear error instead of surfacing as an obscure runtime failure deep
 * inside the framework or the database driver.
 *
 * See constitution.md: "Determinism" (inject Config, no scattered env
 * reads) and "Defensive Boundaries" (validate at the boundary).
 */

export interface ServerConfig {
  host: string;
  port: number;
}

export interface DatabaseConfig {
  client: 'postgres';
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
  ssl: boolean;
  schema: string;
  poolMin: number;
  poolMax: number;
  connectionTimeoutMs: number;
}

export interface SecretsConfig {
  appKeys: string[];
  apiTokenSalt: string;
  adminJwtSecret: string;
  jwtSecret: string;
  transferTokenSalt: string;
  encryptionKey: string;
}

export interface BootstrapAdminConfig {
  email?: string;
  password?: string;
}

export interface EnvConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  secrets: SecretsConfig;
  bootstrapAdmin: BootstrapAdminConfig;
}

export class MissingEnvVarError extends Error {
  constructor(name: string) {
    super(`Missing required environment variable "${name}". Copy .env.example to .env and set it.`);
    this.name = 'MissingEnvVarError';
  }
}

class InvalidEnvVarError extends Error {
  constructor(name: string, reason: string) {
    super(`Invalid environment variable "${name}": ${reason}.`);
    this.name = 'InvalidEnvVarError';
  }
}

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') throw new MissingEnvVarError(name);
  return value;
};

const optionalEnv = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
};

const parseInteger = (name: string, raw: string): number => {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new InvalidEnvVarError(name, `expected an integer, got "${raw}"`);
  return parsed;
};

const optionalEnvInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : parseInteger(name, raw);
};

const optionalEnvBool = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw === 'true';
};

const requireAppKeys = (): string[] => {
  const keys = requireEnv('APP_KEYS')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  if (keys.length === 0)
    throw new InvalidEnvVarError('APP_KEYS', 'must contain at least one comma-separated key');
  return keys;
};

const buildServerConfig = (): ServerConfig => ({
  host: optionalEnv('HOST', '0.0.0.0'),
  port: optionalEnvInt('PORT', 1337),
});

const buildDatabaseConfig = (): DatabaseConfig => ({
  client: 'postgres',
  host: optionalEnv('DATABASE_HOST', 'localhost'),
  port: optionalEnvInt('DATABASE_PORT', 5432),
  name: requireEnv('DATABASE_NAME'),
  username: requireEnv('DATABASE_USERNAME'),
  password: requireEnv('DATABASE_PASSWORD'),
  ssl: optionalEnvBool('DATABASE_SSL', false),
  schema: optionalEnv('DATABASE_SCHEMA', 'public'),
  poolMin: optionalEnvInt('DATABASE_POOL_MIN', 2),
  poolMax: optionalEnvInt('DATABASE_POOL_MAX', 10),
  connectionTimeoutMs: optionalEnvInt('DATABASE_CONNECTION_TIMEOUT', 60000),
});

const buildSecretsConfig = (): SecretsConfig => ({
  appKeys: requireAppKeys(),
  apiTokenSalt: requireEnv('API_TOKEN_SALT'),
  adminJwtSecret: requireEnv('ADMIN_JWT_SECRET'),
  jwtSecret: requireEnv('JWT_SECRET'),
  transferTokenSalt: requireEnv('TRANSFER_TOKEN_SALT'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
});

const buildBootstrapAdminConfig = (): BootstrapAdminConfig => {
  // Both are optional - if not set, no admin will be auto-created
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  // Validate that if email is set, password must also be set (and vice versa)
  if ((email !== undefined && email !== '') !== (password !== undefined && password !== '')) {
    const missing =
      email === undefined || email === '' ? 'BOOTSTRAP_ADMIN_EMAIL' : 'BOOTSTRAP_ADMIN_PASSWORD';
    throw new InvalidEnvVarError(
      'BOOTSTRAP_ADMIN_EMAIL/BOOTSTRAP_ADMIN_PASSWORD',
      `both must be set together or both unset; ${missing} is missing`
    );
  }

  return {
    email: email === undefined || email === '' ? undefined : email,
    password: password === undefined || password === '' ? undefined : password,
  };
};

let cached: EnvConfig | undefined;

/**
 * Reads and validates all environment configuration, caching the result
 * after the first successful call. Throws immediately (fail-fast) if a
 * required variable is missing or malformed.
 */
export const getEnvConfig = (): EnvConfig => {
  if (!cached) {
    cached = {
      server: buildServerConfig(),
      database: buildDatabaseConfig(),
      secrets: buildSecretsConfig(),
      bootstrapAdmin: buildBootstrapAdminConfig(),
    };
  }
  return cached;
};

/** Test-only escape hatch to force re-reading process.env between test cases. */
export const resetEnvConfigCache = (): void => {
  cached = undefined;
};

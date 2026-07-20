import type { Core } from '@strapi/strapi';
import { getEnvConfig } from '../src/config/env';

/**
 * Database connection settings.
 *
 * Values come exclusively from the centralized `getEnvConfig()` module
 * (src/config/env.ts) instead of scattered `process.env`/`env()` reads.
 * PostgreSQL is the only supported client, matching production
 * (constitution.md: Determinism, Replaceability).
 */
const config = (): Core.Config.Database => {
  const { database } = getEnvConfig();

  return {
    connection: {
      client: 'postgres',
      connection: {
        host: database.host,
        port: database.port,
        database: database.name,
        user: database.username,
        password: database.password,
        ssl: database.ssl,
        schema: database.schema,
      },
      pool: { min: database.poolMin, max: database.poolMax },
      acquireConnectionTimeout: database.connectionTimeoutMs,
    },
  } as Core.Config.Database;
};

export default config;

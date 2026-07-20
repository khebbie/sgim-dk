import type { Core } from '@strapi/strapi';
import { getEnvConfig } from '../src/config/env';

/**
 * HTTP server settings, sourced from the centralized `getEnvConfig()`
 * module rather than reading `process.env`/`env()` directly.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const { server, secrets } = getEnvConfig();

  return {
    host: server.host,
    port: server.port,
    app: {
      keys: secrets.appKeys,
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};

export default config;

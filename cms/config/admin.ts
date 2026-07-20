import type { Core } from '@strapi/strapi';
import { getEnvConfig } from '../src/config/env';

/**
 * Admin panel auth/secrets, sourced from the centralized `getEnvConfig()`
 * module rather than reading `process.env`/`env()` directly.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  const { secrets } = getEnvConfig();

  return {
    auth: {
      secret: secrets.adminJwtSecret,
    },
    apiToken: {
      salt: secrets.apiTokenSalt,
    },
    transfer: {
      token: {
        salt: secrets.transferTokenSalt,
      },
    },
    secrets: {
      encryptionKey: secrets.encryptionKey,
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
      docLinks: env.bool('FLAG_DOC_LINKS', true),
    },
  };
};

export default config;

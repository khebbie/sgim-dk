import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = (): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        // NO refresh cookie. The only client of /api/auth/local is our own
        // SvelteKit server, calling over the internal docker network; it uses
        // the returned `jwt` and ignores the refresh token, then sets its OWN
        // httpOnly session cookie for the browser. No browser ever reaches this
        // endpoint, because nginx never proxies /api to Strapi.
        //
        // With httpOnly: true Strapi instead sets a refresh cookie, which under
        // NODE_ENV=production defaults to Secure — and Koa then refuses to send
        // it over the unencrypted internal connection, failing every *correct*
        // login with a 500 ("Cannot send secure cookie over unencrypted
        // connection"). Wrong passwords still returned a clean 400, which is
        // what made it look like a credentials problem.
        //
        // This only reproduces with NODE_ENV=production, so dev and the API
        // contract tests never saw it. Revisit if a browser ever talks to this
        // API directly.
        httpOnly: false,
      },
      // Disable public registration - accounts are admin-created only (sgim-pgx.9)
      allowRegister: false,
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
    },
  },
});

export default config;

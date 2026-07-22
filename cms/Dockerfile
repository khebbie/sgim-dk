# Production image for the Strapi CMS (sgim-0lt.2).
#
# Built in CI, never on the VPS: the admin-panel build is memory hungry and the
# server has 2 GB RAM with no swap. Debian slim (not alpine) because Strapi's
# image pipeline pulls native modules (sharp) with prebuilt glibc binaries.

# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Native toolchain for any dependency without a prebuilt binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `strapi build` loads config/*.ts, which fail-fast on missing env. The
# placeholder values in .env.example are enough to compile the admin panel —
# real credentials are injected at runtime, never baked into the image.
RUN cp .env.example .env \
    && NODE_ENV=production npm run build \
    && rm -f .env

RUN npm prune --omit=dev

# ---- runtime ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=1337

# Compiled output (dist/ holds config/, src/ and the built admin), the manifest
# and production dependencies. public/ carries Strapi's static files; the
# uploads subdirectory is mounted as a volume in compose so media survives
# redeploys and is backed up separately.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
# tsconfig.json is what tells Strapi this is a TypeScript project, so it loads
# the compiled config from dist/ instead of looking for ./config. Without it
# the server starts with empty config and dies on "Cannot destructure property
# 'client' of 'db.config.connection'".
COPY --from=build /app/tsconfig.json ./tsconfig.json

# Paths Strapi writes to at runtime. /app itself stays root-owned (read-only to
# the app user); only these are writable, and only these are chowned so the
# large node_modules layer is not duplicated.
#   public/uploads      - media (mounted as a volume in production)
#   database/migrations - Strapi creates this on boot
#   .tmp, .strapi       - runtime scratch
RUN mkdir -p /app/public/uploads /app/database/migrations /app/.tmp /app/.strapi \
    && chown -R node:node /app/public /app/database /app/.tmp /app/.strapi

USER node

EXPOSE 1337

# NOTE: no port is published for this service in production — the API must be
# reachable only over the internal docker network (see sgim-0lt.3).
CMD ["npm", "run", "start"]

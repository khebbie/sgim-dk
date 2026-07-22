# Production image for the SvelteKit site (sgim-0lt.2).
#
# Built in CI, never on the 2 GB VPS. Multi-stage so the runtime image carries
# only the adapter-node output plus production dependencies.

# ---- build ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Install with the lockfile exactly as CI/dev do.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Drop dev dependencies so the runtime stage copies a lean tree.
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

# adapter-node needs the build output, the manifest and production deps only.
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Run unprivileged; the node image already ships a `node` user.
USER node

EXPOSE 3000

# No healthcheck here: compose owns it, so the check can be changed without
# rebuilding the image.
CMD ["node", "build/index.js"]

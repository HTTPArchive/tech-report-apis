# Stage 1 – Prune: identify the minimal monorepo subtree needed for bigquery-export
FROM node:24-alpine AS pruner
WORKDIR /app
COPY . .
RUN npx --yes turbo@^2 prune bigquery-export --docker

# Stage 2 – Installer: install only production deps for the pruned workspace
FROM node:24-alpine AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --quiet --no-fund --no-audit

# Stage 3 – Runner: lean production image
FROM node:24-alpine AS runner
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node --from=pruner /app/out/full/ .
COPY --chown=node:node --from=installer /app/node_modules ./node_modules
WORKDIR /app/apps/bigquery-export
CMD ["node", "index.js"]

FROM node:22.21.1-alpine

WORKDIR /app

RUN chown node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --only=production --quiet --no-fund --no-audit && npm cache clean --force

COPY --chown=node:node . .

ENV PORT=8080

CMD ["npx", "functions-framework", "--target=app"]
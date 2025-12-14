FROM node:22.21.1-alpine

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --only=production --quiet --no-fund --no-audit && npm cache clean --force

COPY . .

ENV PORT=8080

CMD ["npx", "functions-framework", "--target=app"]
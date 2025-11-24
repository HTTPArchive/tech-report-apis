FROM node:22-slim

# Set the working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (this layer will be cached unless package files change)
RUN npm ci --only=production --quiet --no-fund --no-audit && npm cache clean --force

ENV DATABASE=tech-report-api-prod

# Copy source code
COPY . .

CMD ["node", "index.js"]

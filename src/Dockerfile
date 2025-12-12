FROM node:22-slim

# Set the working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (this layer will be cached unless package files change)
RUN npm ci --only=production --quiet --no-fund --no-audit && npm cache clean --force

# Copy source code
COPY . .

# Cloud Run expects the container to listen on PORT (default 8080)
ENV PORT=8080

# Use Functions Framework to serve the app
CMD ["npx", "functions-framework", "--target=app"]

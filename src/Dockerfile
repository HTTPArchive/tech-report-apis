FROM node:24-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PROJECT=httparchive
ENV DATABASE=tech-report-apis-prod

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD [ "npm", "start" ]

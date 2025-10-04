<<<<<<< HEAD
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p data logs uploads

# Set permissions
RUN chmod 755 data logs uploads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
=======
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./
RUN npm install --quiet || true
COPY . .
RUN npm run build || true
EXPOSE 3001
CMD ["npm", "run", "dev"]
>>>>>>> e0c392214cbb541e36508749d9336f9cc9e18c38

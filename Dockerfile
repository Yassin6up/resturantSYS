# Multi-stage build for production

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend and final image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy backend source
COPY server/ ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./public

# Create data directory
RUN mkdir -p /app/data /app/backups

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S posq -u 1001
RUN chown -R posq:nodejs /app
USER posq

WORKDIR /app/server

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

EXPOSE 3001

CMD ["npm", "start"]
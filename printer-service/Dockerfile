FROM node:18-alpine

# Install system dependencies for USB printing
RUN apk add --no-cache \
    libusb-dev \
    eudev-dev \
    linux-headers \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S printer -u 1001
RUN chown -R printer:nodejs /app
USER printer

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["npm", "start"]
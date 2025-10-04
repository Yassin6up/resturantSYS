<<<<<<< HEAD
<<<<<<< HEAD
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for USB printer support
RUN apk add --no-cache \
    usbutils \
    libusb-dev \
    linux-headers

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 4000

# Start the service
CMD ["npm", "start"]
=======
=======
>>>>>>> origin/main
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./ || true
RUN npm install --quiet || true
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
<<<<<<< HEAD
>>>>>>> e0c392214cbb541e36508749d9336f9cc9e18c38
=======
>>>>>>> origin/main

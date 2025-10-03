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
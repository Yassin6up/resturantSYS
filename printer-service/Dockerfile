FROM node:18-alpine

WORKDIR /app

# Install dependencies for USB printer support
RUN apk add --no-cache \
    usbutils \
    libusb-dev \
    linux-headers

COPY package*.json ./
RUN npm install --production

COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 4000

CMD ["npm", "start"]
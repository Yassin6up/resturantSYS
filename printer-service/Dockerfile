FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache usbutils libusb-dev linux-headers

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p logs \
  && addgroup -S posq && adduser -S posq -G posq \
  && chown -R posq:posq /app

USER posq

EXPOSE 4000

CMD ["node", "index.js"]

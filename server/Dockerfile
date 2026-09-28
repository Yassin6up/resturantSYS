FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache sqlite python3 make g++ curl

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p data logs uploads \
  && chmod 755 data logs uploads \
  && addgroup -S posq && adduser -S posq -G posq \
  && chown -R posq:posq /app

USER posq

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "index.js"]

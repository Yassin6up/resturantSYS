FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund || true
COPY . .
EXPOSE 4000
CMD ["npm","run","start"]

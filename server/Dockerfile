FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm install --production --no-audit --no-fund || true
COPY . .
EXPOSE 3001
CMD ["npm","run","start"]

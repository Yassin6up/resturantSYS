FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./
RUN npm install --quiet || true
COPY . .
RUN npm run build || true
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

# Default: API server (worker service overrides command in docker-compose)
CMD ["node", "src/index.js"]

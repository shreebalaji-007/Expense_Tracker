FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY backend/package.json backend/package.json
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build -w backend
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "backend"]

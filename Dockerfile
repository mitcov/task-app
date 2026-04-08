# Stage 1: Build React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .
# Copy the React build output into backend/public so Express serves it
COPY --from=frontend /app/build ./public

EXPOSE 3001
CMD ["node", "index.js"]

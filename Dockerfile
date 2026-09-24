# ---------- Build stage: frontend (Vue 3 + Vite 8) ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for Vite build)
RUN npm ci

# Copy application code and build frontend to dist/
COPY . .
RUN npm run build

# ---------- Runtime stage: backend (Express) ----------
FROM node:22-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source
COPY store.js swagger.js ./
COPY config ./config
# config.js 已被 .dockerignore 排除（本机凭据不入镜像）；用模板占位，
# 实际配置值全部由 docker-compose 环境变量注入（DB_* / SESSION_SECRET / CSRF_SECRET）
RUN cp config/config.example.js config/config.js
COPY controllers ./controllers
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY sql ./sql
COPY scripts ./scripts

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs backup

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/auth/current-user', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "store.js"]

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
RUN npm run build

# Stage 3: Production
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/nginx/conf.d/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
# ============================================
# STAGE 1: Base Configuration
# ============================================
FROM node:22.21.0-bookworm-slim AS base

LABEL maintainer="devops-team@google.com"
LABEL description="BBB Meeting Frontend - React/Vite"

WORKDIR /app

# Install dumb-init
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Configure npm
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 100000

# ============================================
# STAGE 2: Development Environment
# ============================================
FROM base AS development

ENV NODE_ENV=development

COPY package*.json ./

RUN npm install --loglevel=error && \
    npm cache clean --force

COPY . .

# Vite port
EXPOSE 5173

# Host flag is critical for Docker networking
CMD ["npm", "run", "dev", "--", "--host"]

# ============================================
# STAGE 3: Builder
# ============================================
FROM base AS builder

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --loglevel=error

COPY . .
RUN npm run build

# ============================================
# STAGE 4: Production Runtime (Nginx)
# ============================================
FROM nginx:stable-alpine AS production

LABEL maintainer="devops-team@google.com"
LABEL stage="production"

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (Assuming it exists in infra context, 
# but usually we mount it or copy it if it's inside the frontend repo)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
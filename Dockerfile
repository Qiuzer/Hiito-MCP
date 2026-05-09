# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (leverage Docker cache)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (use npm install for Dockerfile builds)
RUN npm install --production=false

# Copy source code
COPY src ./src/

# Build TypeScript
RUN npm run build

# ============================================

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install wget for health checks (curl not needed - only wget used in HEALTHCHECK)
RUN apk add --no-cache wget

# Copy package files
COPY package*.json ./

# Create non-root user first (must exist before chown)
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Create directory with proper permissions
RUN mkdir -p /app/node_modules && chown -R nodejs:nodejs /app

# Install only production dependencies
RUN npm install --production=true

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist/

USER nodejs

# Environment variables with defaults
ENV WECHAT_APP_ID=
ENV CLOUD_ENV_ID=
ENV TARGET_ENV_ID=
ENV MCP_AUTH_TOKEN=
ENV NODE_ENV=production
ENV TRANSPORT_MODE=http
ENV PORT=8080
ENV CHARACTER_LIMIT=25000
ENV REQUEST_TIMEOUT_MS=30000

# Health check - port must match CMD PORT (default 8080, non-privileged)
# CloudBase K8s probe overrides this with its own healthCheckConfig
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Expose port 8080 (non-privileged, CloudBase will map to port 80 externally)
EXPOSE 8080

# Start the server on port 8080
CMD ["node", "dist/index.js"]

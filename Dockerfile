# 第一阶段：构建阶段 (Builder)
FROM node:20-alpine AS builder

WORKDIR /app

# 1. 复制依赖清单
COPY package*.json tsconfig.json ./

# 2. 安装所有依赖（包含开发依赖，以便编译 TypeScript）
RUN npm install

# 3. 复制源码
COPY src ./src/

# 4. 执行编译
# 优化点：通过 --skipLibCheck 减少内存占用，并确保 tsconfig.json 已经排除了 __tests__ 目录
# 如果你无法修改 tsconfig.json，可以在此处使用：RUN npx tsc --skipLibCheck --excludeDirectories src/__tests__
RUN npm run build

# ============================================

# 第二阶段：运行阶段 (Production)
FROM node:20-alpine

WORKDIR /app

# 安装 wget 用于腾讯云健康检查（腾讯云 K8s 探针默认使用）
RUN apk add --no-cache wget

# 1. 只复制生产环境需要的依赖清单
COPY package*.json ./

# 2. 创建非 root 用户，提升安全性
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
RUN mkdir -p /app/node_modules && chown -R nodejs:nodejs /app

# 3. 只安装生产环境依赖（不安装 vitest 等）
RUN npm install --production=true

# 4. 从构建阶段只复制编译后的产物 (dist 目录)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist/

# 切换到非 root 用户
USER nodejs

# 环境变量配置
ENV NODE_ENV=production
ENV TRANSPORT_MODE=http
ENV PORT=8080

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["node", "dist/index.js"]
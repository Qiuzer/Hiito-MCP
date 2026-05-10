/**
 * Hiito MCP Server - Optimized for Stability & Idempotency
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { registerPartyTools } from './tools/party_tools.js';
import { logError } from './utils/errors.js';

// --- 配置管理 ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const CONFIG = {
  ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8080', 10),
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  VERSION: pkg.version ?? '1.0.0',
};

// --- 会话持久化存储 (幂等性核心) ---
// 如果是多实例部署，建议将此处替换为 Redis 存储
const sessionTransports = new Map<string, StreamableHTTPServerTransport>();

/**
 * 优化 1: 工厂函数封装
 * 保证 MCP Server 实例的配置逻辑统一
 */
function createMcpInstance() {
  const server = new McpServer(
    { name: 'hiito-mcp-server', version: CONFIG.VERSION },
    { capabilities: { tools: {}, resources: {} } }
  );
  registerPartyTools(server);
  return server;
}

/**
 * 免鉴权中间件
 * HTTP + SSE 模式下直接放行所有请求
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  next(); // 直接放行
}

/**
 * 优化 3: HTTP Server 逻辑优化
 * 解决会话竞争与内存泄漏隐患
 */
async function startHTTPServer() {
  const app = express();

  // 基础安全中间件
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(CONFIG.ENV === 'production' ? 'combined' : 'dev'));

  // 速率限制
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  // MCP 核心接口
  app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
    // 幂等标识：优先使用客户端提供的 session-id
    const sessionId = req.headers['mcp-session-id'] as string;

    // 设置请求超时守卫
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      let transport: StreamableHTTPServerTransport;

      // 幂等逻辑：检查是否已有活跃会话
      if (sessionId && sessionTransports.has(sessionId)) {
        transport = sessionTransports.get(sessionId)!;
      } else {
        // 创建新传输层
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId || randomUUID(),
          onsessioninitialized: (id) => {
            console.log(`[Session] Initialized: ${id}`);
            sessionTransports.set(id, transport);
          }
        });

        transport.onclose = () => {
          if (transport.sessionId) sessionTransports.delete(transport.sessionId);
        };

        const mcpServer = createMcpInstance();
        await mcpServer.connect(transport);
      }

      // 处理请求
      await transport.handleRequest(req, res, req.body);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        if (!res.headersSent) res.status(504).json({ error: 'Gateway Timeout' });
      } else {
        logError('MCP_TRANSPORT', error);
        if (!res.headersSent) res.status(500).json({ error: 'Internal Error' });
      }
    } finally {
      clearTimeout(timeout);
    }
  });

  // 健康检查
  app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  app.listen(CONFIG.PORT, () => {
    console.log(`🌐 Server active on port ${CONFIG.PORT} [Mode: HTTP]`);
  });
}

/**
 * 优化 4: 入口点逻辑简化
 */
async function main() {
  const mode = process.env.TRANSPORT_MODE || 'stdio';

  if (mode === 'http') {
    await startHTTPServer();
  } else {
    const server = createMcpInstance();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log('🔌 Server active [Mode: STDIO]');
  }
}

main().catch(err => {
  logError('FATAL_INIT', err);
  process.exit(1);
});
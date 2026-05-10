/**
 * Hiito MCP Server - Optimized for Cloud Hosting (Stateless)
 */

import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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
  TENCENT_SECRET_ID: process.env.TENCENT_SECRET_ID,
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT_MS || '25000', 10),
  VERSION: pkg.version ?? '1.0.0',
};

/**
 * 工厂函数：创建 MCP Server 实例
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
 * 身份验证中间件
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 信任腾讯云网关签名请求
  if (authHeader?.startsWith('TC3')) return next();

  // 未配置 TENCENT_SECRET_ID 则跳过校验（公开访问）
  if (!CONFIG.TENCENT_SECRET_ID) return next();

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  const expected = Buffer.from(CONFIG.TENCENT_SECRET_ID);
  const actual = Buffer.from(token);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}

/**
 * HTTP Server（SSE 模式）
 *
 * 设计原则：
 * - 每个客户端连接独立创建 server + transport，避免 "already initialized" 错误
 * - session 存储在内存 Map 中，CloudBase 需配置单实例运行
 */
async function startHTTPServer() {
  const app = express();

  // 信任腾讯云托管反向代理，解决 express-rate-limit ERR_ERL_FORWARDED_HEADER 错误
  app.set('trust proxy', 1);

  // 基础安全中间件
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(CONFIG.ENV === 'production' ? 'combined' : 'dev'));

  // 速率限制
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  // 内存中维护 SSE session（单实例运行，多实例需要 Redis 等共享存储）
  const sessions = new Map<string, SSEServerTransport>();

  // GET /mcp —— 建立 SSE 连接（每个客户端独立 server + transport）
  app.get('/mcp', authMiddleware, async (_req: Request, res: Response) => {
    try {
      const transport = new SSEServerTransport('/mcp/messages', res);
      const mcpServer = createMcpInstance();
      await mcpServer.connect(transport);

      sessions.set(transport.sessionId, transport);
      console.log(`[Session] Opened: ${transport.sessionId}`);

      res.on('close', () => {
        sessions.delete(transport.sessionId);
        console.log(`[Session] Closed: ${transport.sessionId}`);
      });
    } catch (error: any) {
      logError('MCP_SSE_CONNECT', error);
      console.error('[SSE] Connection failed:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Error' });
      }
    }
  });

  // POST /mcp/messages —— 接收 JSON-RPC 消息
  app.post('/mcp/messages', authMiddleware, async (req: Request, res: Response) => {
    const reqStart = Date.now();
    const sessionId = req.query.sessionId as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId query parameter' });
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: 'Session not found' });
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
      console.log(`[Message] Session ${sessionId} processed in ${Date.now() - reqStart}ms`);
    } catch (error: any) {
      logError('MCP_MESSAGE', error);
      console.error(`[Message] Session ${sessionId} failed:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Error' });
      }
    }
  });

  // 健康检查
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', uptime: process.uptime(), version: CONFIG.VERSION })
  );

  app.listen(CONFIG.PORT, () => {
    console.log(`🌐 Server active on port ${CONFIG.PORT} [Mode: SSE | Multi-session]`);
  });
}

/**
 * 入口点
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

main().catch((err) => {
  logError('FATAL_INIT', err);
  process.exit(1);
});
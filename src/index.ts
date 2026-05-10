/**
 * Hiito MCP Server - Optimized for Cloud Hosting (Stateless)
 */

import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'crypto';
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
  TENCENT_SECRET_ID: process.env.TENCENT_SECRET_ID,
  // 外层守卫超时需大于 CloudBase SDK 超时(20s)，小于云托管网关超时
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
 * 支持时间等值比较，防止侧信道攻击
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 信任腾讯云网关签名请求
  if (authHeader?.startsWith('TC3')) return next();

  // 无需校验则跳过
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
 * HTTP Server（无状态模式）
 *
 * 设计原则：
 * - 云托管为多实例部署，不在内存中维护任何 session
 * - 每次请求独立创建 transport + MCP server 实例
 * - 通过 Promise + resolveInit 桥接 onsessioninitialized 回调
 * - 等待初始化完成后再处理请求，确保 server ready
 * - 超时层级：SDK(20s) < 请求守卫(25s) < 云托管网关(30s)
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
    const reqStart = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      // resolveInit 用于在 onsessioninitialized 回调中通知外部 Promise
      let resolveInit!: () => void;

      const initTimeout = setTimeout(
        () => { throw new Error('MCP init timeout'); },
        5000
      );

      // 无状态：每次请求独立创建实例，天然支持多实例云托管
      // onsessioninitialized 必须作为构造参数传入（SDK 类型约束）
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId: string) => {
          clearTimeout(initTimeout);
          console.log(`[Session] Ready: ${sessionId} | init: ${Date.now() - reqStart}ms`);
          resolveInit();
        },
      });

      const mcpServer = createMcpInstance();

      // 等待 onsessioninitialized 回调触发，确保 server 真正 ready 后再处理请求
      await new Promise<void>((resolve, reject) => {
        resolveInit = resolve;
        mcpServer.connect(transport).catch(reject);
      });

      await transport.handleRequest(req, res, req.body);

      console.log(`[Request] Completed in ${Date.now() - reqStart}ms`);
    } catch (error: any) {
      const elapsed = Date.now() - reqStart;

      if (error.name === 'AbortError') {
        console.warn(`[Request] Timeout after ${elapsed}ms`);
        if (!res.headersSent) res.status(504).json({ error: 'Gateway Timeout' });
      } else {
        logError('MCP_TRANSPORT', error);
        console.error(`[Request] Failed after ${elapsed}ms:`, error.message);
        if (!res.headersSent) res.status(500).json({ error: 'Internal Error' });
      }
    } finally {
      clearTimeout(timeout);
    }
  });

  // 健康检查
  app.get('/health', (req, res) =>
    res.json({ status: 'ok', uptime: process.uptime(), version: CONFIG.VERSION })
  );

  app.listen(CONFIG.PORT, () => {
    console.log(`🌐 Server active on port ${CONFIG.PORT} [Mode: HTTP | Stateless]`);
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
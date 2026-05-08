/**
 * Hiito MCP Server - Main Entry Point
 *
 * Supports three transport modes:
 * 1. stdio - Local AI terminals (Claude Desktop, etc.)
 * 2. HTTP - Remote AI terminals (via CloudBase HTTP trigger)
 * 3. SSE - MCP Square Hosted mode (Server-Sent Events)
 */

import 'dotenv/config';
import { randomUUID, timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { registerPartyTools } from './tools/party_tools.js';
import { RESPONSE_CONFIG } from './utils/errors.js';
import { logError } from './utils/errors.js';

// Environment configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as any;
const SERVER_VERSION = pkg.version ?? '1.0.0';

// Server configuration
const CONFIG = {
  WECHAT_APP_ID: process.env.WECHAT_APP_ID || '',
  CLOUD_ENV_ID: process.env.CLOUD_ENV_ID || '',
  TARGET_ENV_ID: process.env.TARGET_ENV_ID || '',
  MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN,
  CHARACTER_LIMIT: parseInt(process.env.CHARACTER_LIMIT || '25000', 10),
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
};

// Default CORS origins for production (allow MCP Square domains)
const DEFAULT_CORS_ORIGINS = [
  'https://cloud.tencent.com',
  'https://cloudbase.mcp-square.com',
];

// Validate required environment variables
function validateConfig(): void {
  const missing: string[] = [];

  if (!CONFIG.WECHAT_APP_ID) missing.push('WECHAT_APP_ID');
  if (!CONFIG.CLOUD_ENV_ID) missing.push('CLOUD_ENV_ID');
  if (!CONFIG.TARGET_ENV_ID) missing.push('TARGET_ENV_ID');

  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  } else {
    console.log('✅ Environment configuration validated');
    console.log(`   WECHAT_APP_ID: ${CONFIG.WECHAT_APP_ID.slice(0, 4)}${'*'.repeat(Math.max(0, CONFIG.WECHAT_APP_ID.length - 4))}`);
    console.log(`   CLOUD_ENV_ID: ${CONFIG.CLOUD_ENV_ID.slice(0, 4)}${'*'.repeat(Math.max(0, CONFIG.CLOUD_ENV_ID.length - 4))}`);
    console.log(`   TARGET_ENV_ID: ${CONFIG.TARGET_ENV_ID.slice(0, 4)}${'*'.repeat(Math.max(0, CONFIG.TARGET_ENV_ID.length - 4))}`);
  }

  console.log(`   CHARACTER_LIMIT: ${CONFIG.CHARACTER_LIMIT} chars`);
  console.log(`   REQUEST_TIMEOUT: ${CONFIG.REQUEST_TIMEOUT_MS / 1000}s`);
}

// Create MCP Server instance
function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'hiito-mcp-server',
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );
  registerPartyTools(server);

  console.log('✅ MCP tools registered');

  return server;
}

// Authentication middleware for HTTP mode
function authMiddleware(req: Request, res: Response, next: () => void): void {
  // In production, auth token is required
  const isProduction = process.env.NODE_ENV === 'production';
  if (!CONFIG.MCP_AUTH_TOKEN) {
    if (isProduction) {
      console.error('🔒 MCP_AUTH_TOKEN not set in production - server shutting down');
      process.exit(1); // 生产环境强制退出
    }
    // Dev mode: allow without token but log a warning
    console.warn('⚠️ No MCP_AUTH_TOKEN set - running without authentication (dev mode)');
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  // Use timingSafeEqual to prevent timing attacks
  const expected = Buffer.from(CONFIG.MCP_AUTH_TOKEN);
  const actual = Buffer.from(token);
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  next();
}

// SSE Session management with memory limits
const sseTransports: Map<string, { transport: SSEServerTransport; createdAt: number }> = new Map();
const MAX_SSE_SESSIONS = 1000; // Maximum concurrent SSE sessions
const SSE_SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup of stale SSE sessions and enforcement of max sessions
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  // Enforce max sessions: remove oldest sessions if over limit
  if (sseTransports.size >= MAX_SSE_SESSIONS) {
    const entries = Array.from(sseTransports.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Remove oldest 50% when over limit
    const toRemove = entries.slice(0, Math.floor(MAX_SSE_SESSIONS / 2));
    for (const [id, entry] of toRemove) {
      entry.transport.close?.();
      sseTransports.delete(id);
      cleaned++;
    }
    console.warn(`[SSE] Session limit reached (${MAX_SSE_SESSIONS}), removed ${cleaned} oldest sessions`);
  }

  // Clean up expired sessions
  for (const [sessionId, entry] of sseTransports) {
    if (now - entry.createdAt > SSE_SESSION_TTL_MS) {
      entry.transport.close?.();
      sseTransports.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[SSE] Cleaned up ${cleaned} session(s). Active: ${sseTransports.size}`);
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Start HTTP server mode with SSE support
async function startHTTPServer(server: McpServer): Promise<void> {
  const app = express();

  // Security headers - CSP allows SSE connections and Tencent Cloud domains
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'blob:',
          'https://*.tcloudbase.com',
          'https://*.cloud.tencent.com',
        ],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for markdown rendering
        imgSrc: ["'self'", 'data:', 'https:'],
        mediaSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS - allow configurable origins, defaults for MCP Square in production
  const corsOrigins = process.env.CORS_ORIGINS;
  app.use(cors({
    origin: corsOrigins
      ? corsOrigins.split(',')
      : (process.env.NODE_ENV === 'production' ? DEFAULT_CORS_ORIGINS : true),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Request logging - production format without sensitive data
  if (process.env.NODE_ENV === 'production') {
    // Custom format that doesn't log Authorization header
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms ":referrer" ":user-agent"'));
  } else {
    app.use(morgan('dev'));
  }

  // Body parsing (after rate limiter so it applies to all requests)
  app.use(express.json({ limit: '1mb' }));

  // Health check endpoint with memory stats (no sensitive info)
  app.get('/health', (_req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      service: 'hiito-mcp-server',
      version: SERVER_VERSION,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      activeSseSessions: sseTransports.size,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      },
    });
  });

  // MCP endpoint (Streamable HTTP mode) with timeout
  app.all('/mcp', authMiddleware, async (req: Request, res: Response) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, CONFIG.REQUEST_TIMEOUT_MS);

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logError('MCP', error);
      if (!res.headersSent) {
        if ((error as Error).name === 'AbortError') {
          res.status(504).json({ error: 'Request timeout' });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  });

  // SSE endpoint for MCP Square Hosted mode
  app.get('/sse', authMiddleware, async (_req: Request, res: Response) => {
    // Check if max sessions reached
    if (sseTransports.size >= MAX_SSE_SESSIONS) {
      logError('SSE', new Error('Max sessions reached'));
      res.status(503).json({ error: 'Server busy, please try again later' });
      return;
    }

    try {
      const sessionId = randomUUID();
      const transport = new SSEServerTransport('/message', res);
      sseTransports.set(sessionId, { transport, createdAt: Date.now() });

      res.on('close', () => {
        sseTransports.delete(sessionId);
      });

      await server.connect(transport);
      console.log(`[SSE] Client connected: ${sessionId.slice(0, 8)}... (active: ${sseTransports.size})`);
    } catch (error) {
      logError('SSE', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'SSE connection failed' });
      }
    }
  });

  // Message endpoint for SSE mode
  app.post('/message', authMiddleware, async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['x-session-id'] as string;

      if (!sessionId) {
        res.status(400).json({ error: 'Missing session ID' });
        return;
      }

      const entry = sseTransports.get(sessionId);

      if (!entry) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      await entry.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      logError('SSE-Message', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Message handling failed' });
      }
    }
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: () => void) => {
    logError('Express', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start server - validate PORT is a valid number
  const rawPort = process.env.PORT || '8080';
  const PORT = parseInt(rawPort, 10);
  if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
    console.error(`❌ Invalid PORT value: "${rawPort}"`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🌐 HTTP server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`   SSE endpoint: http://localhost:${PORT}/sse`);
    console.log(`   Message endpoint: http://localhost:${PORT}/message`);
    console.log(`   Max SSE sessions: ${MAX_SSE_SESSIONS}`);
    console.log(`   Character limit: ${RESPONSE_CONFIG.CHARACTER_LIMIT}`);
  });
}

// Start stdio server mode
async function startStdioServer(server: McpServer): Promise<void> {
  console.log('🔌 Starting in stdio mode...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log('✅ MCP server connected via stdio');
}

// Main entry point
async function main(): Promise<void> {
  console.log('🚀 Starting Hiito MCP Server...');
  console.log('');

  // Validate configuration
  validateConfig();
  console.log('');

  // Create server instance
  const server = createServer();
  console.log('');

  // Check transport mode
  const mode = process.env.TRANSPORT_MODE || 'stdio';

  if (mode === 'http') {
    await startHTTPServer(server);
  } else {
    await startStdioServer(server);
  }
}

// Run
main().catch((error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

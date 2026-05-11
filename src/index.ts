import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerPartyTools } from './tools/party_tools.js';
import { logError } from './utils/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const CONFIG = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN,
  VERSION: pkg.version ?? '1.0.0',
};

// Factory function to create a new McpServer instance for each request (stateless mode)
function createMcpServerInstance() {
  const server = new McpServer(
    { name: 'hiito-mcp-server', version: CONFIG.VERSION },
    { capabilities: { tools: {}, resources: {} } }
  );
  registerPartyTools(server);
  return server;
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  // 1. Health Check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: CONFIG.VERSION }));
    return;
  }

  // 2. MCP Endpoint
  if (url.pathname.startsWith('/mcp')) {
    // Auth Check
    if (!checkAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Request-level Transport for Multi-user Concurrency
    const sessionId = url.searchParams.get('sessionId') || randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
    });

    try {
      // Create a new McpServer instance for this request (stateless)
      const mcpServerInstance = createMcpServerInstance();
      
      // Connect transport for this specific request
      await mcpServerInstance.connect(transport);
      // Let SDK handle the rest (GET for SSE, POST for JSON-RPC)
      await transport.handleRequest(req, res);
    } catch (error: any) {
      logError('MCP_RUNTIME_ERROR', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    } finally {
      // Clean up transport for non-SSE requests to prevent memory leaks
      if (req.method !== 'GET') {
        await transport.close().catch(() => {});
      }
    }
    return;
  }

  // 4. Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

function checkAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers.authorization;
  // Trust CloudBase Gateway or internal signatures if provided
  if (authHeader?.startsWith('TC3')) return true;
  // Fallback to Bearer token
  if (!CONFIG.MCP_AUTH_TOKEN) return true;
  return authHeader === `Bearer ${CONFIG.MCP_AUTH_TOKEN}`;
}

server.listen(CONFIG.PORT, () => {
  console.log(`✅ Hiito MCP Server [Stateless] active on port ${CONFIG.PORT}`);
});

#!/usr/bin/env node
import https from 'https';
import http from 'http';
import { URL } from 'url';

const BASE_URL = process.env.MCP_SERVER_URL || 'https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp';
const TOKEN = process.env.MCP_AUTH_TOKEN || '';

let sessionId = null;

function makeRequest(body) {
  const url = new URL(BASE_URL);
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(JSON.stringify(body)),
  };

  // Include session ID if we have one
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
    console.log('  -> Sending with session ID:', sessionId);
  } else {
    console.log('  -> No session ID (initial request)');
  }

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers,
  };

  return new Promise((resolve, reject) => {
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // Capture session ID from response headers if we don't have one yet
        const newSessionId = res.headers['mcp-session-id'];
        if (newSessionId && !sessionId) {
          sessionId = Array.isArray(newSessionId) ? newSessionId[0] : newSessionId;
          console.log('  -> Captured session ID:', sessionId);
        }
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('1. Initializing MCP server...');
  const initRes = await makeRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' },
    },
  });
  console.log('Status:', initRes.status);
  console.log('Response:', initRes.data);

  console.log('\n2. Sending initialized notification...');
  const notifRes = await makeRequest({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  console.log('Status:', notifRes.status);
  console.log('Response:', notifRes.data);

  console.log('\n3. Calling tools/list...');
  const listRes = await makeRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  });
  console.log('Status:', listRes.status);
  console.log('Response:', listRes.data);

  console.log('\n4. Calling party_search_nearby...');
  const callRes = await makeRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'party_search_nearby',
      arguments: {
        latitude: 39.9839,
        longitude: 116.43528,
        radius: 5000,
      },
    },
  });
  console.log('Status:', callRes.status);
  console.log('Response:', callRes.data);
}

main().catch(console.error);

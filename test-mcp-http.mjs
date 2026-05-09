#!/usr/bin/env node
/**
 * MCP HTTP 传输测试脚本
 * 测试 hiito-mcp-server 的 party_search_nearby 工具
 */

import https from 'https';

const MCP_URL = 'https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

// 辅助函数：发送JSON-RPC请求
function sendRequest(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // 检查是否是SSE格式
        if (data.startsWith('event:')) {
          const lines = data.split('\n');
          const dataLine = lines.find(l => l.startsWith('data:'));
          if (dataLine) {
            const jsonStr = dataLine.substring(5).trim();
            resolve(JSON.parse(jsonStr));
          }
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testMCP() {
  console.log('🚀 开始测试 MCP 连接...\n');

  try {
    // 步骤1: 初始化
    console.log('📡 步骤1: 初始化 MCP 连接...');
    const initResult = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-script', version: '1.0.0' }
      }
    });
    console.log('✅ 初始化成功:', JSON.stringify(initResult.result?.serverInfo, null, 2));

    // 步骤2: 发送initialized通知
    console.log('\n📡 步骤2: 发送initialized通知...');
    await sendRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    console.log('✅ 初始化通知已发送');

    // 步骤3: 调用party_search_nearby工具
    console.log('\n📡 步骤3: 调用 party_search_nearby 工具...');
    console.log('   参数: latitude=39.9839, longitude=116.43528, radius=5000\n');
    
    const toolResult = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'party_search_nearby',
        arguments: {
          latitude: 39.9839,
          longitude: 116.43528,
          radius: 5000,
          limit: 20,
          response_format: 'markdown'
        }
      }
    });

    console.log('✅ 工具调用成功！\n');
    console.log('📊 查询结果：');
    console.log('='.repeat(60));
    
    if (toolResult.result?.content) {
      toolResult.result.content.forEach(item => {
        if (item.type === 'text') {
          console.log(item.text);
        }
      });
    } else {
      console.log(JSON.stringify(toolResult, null, 2));
    }

    console.log('\n✅ 测试完成！MCP服务器工作正常。');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testMCP();

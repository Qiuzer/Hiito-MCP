#!/usr/bin/env node
/**
 * MCP HTTP 测试脚本（简化版）
 * 使用stateless模式测试hiito-mcp-server
 */

import https from 'https';

const MCP_URL = 'https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

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
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          // 尝试解析SSE格式
          if (data.includes('event:')) {
            const lines = data.split('\n');
            const dataLine = lines.find(l => l.startsWith('data:'));
            if (dataLine) {
              const jsonStr = dataLine.substring(5).trim();
              resolve(JSON.parse(jsonStr));
              return;
            }
          }
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🚀 测试MCP服务器...\n');

  try {
    // 步骤1: 初始化
    console.log('📡 步骤1: 初始化...');
    const initResult = await sendRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'curl-test', version: '1.0.0' }
      }
    });
    
    if (initResult.result) {
      console.log('✅ 初始化成功');
      console.log(`   服务器: ${initResult.result.serverInfo?.name}`);
      console.log(`   版本: ${initResult.result.serverInfo?.version}`);
      console.log(`   协议: ${initResult.result.protocolVersion}`);
    } else {
      console.log('❌ 初始化失败:', initResult);
      return;
    }

    // 步骤2: 调用工具
    console.log('\n📡 步骤2: 调用 party_search_nearby...');
    console.log('   参数: 纬度=39.9839, 经度=116.43528, 半径=5000米\n');

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

    console.log('✅ 工具调用结果：');
    console.log('='.repeat(60));
    
    if (toolResult.result?.content) {
      toolResult.result.content.forEach(item => {
        if (item.type === 'text') {
          console.log(item.text);
        }
      });
    } else if (toolResult.error) {
      console.log('❌ 错误:', toolResult.error.message);
      console.log(JSON.stringify(toolResult, null, 2));
    } else {
      console.log(JSON.stringify(toolResult, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

test();

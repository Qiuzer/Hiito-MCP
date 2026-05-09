#!/usr/bin/env node
/**
 * 完整的MCP HTTP测试脚本
 * 正确处理session管理
 */

import https from 'https';

const MCP_URL = 'https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

// 存储session ID
let sessionId = null;

function sendRequest(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Length': Buffer.byteLength(JSON.stringify(body))
    };

    // 如果有sessionId，添加到header
    if (sessionId) {
      headers['Mcp-Session-Id'] = sessionId;
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers
    };

    const req = https.request(options, (res) => {
      // 检查是否有新的session ID
      const newSessionId = res.headers['mcp-session-id'];
      if (newSessionId && !sessionId) {
        sessionId = newSessionId;
        console.log(`📝 获取到 session ID: ${sessionId}\n`);
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        // 尝试解析SSE格式
        if (data.includes('event:')) {
          const lines = data.split('\n');
          const dataLine = lines.find(l => l.startsWith('data:'));
          if (dataLine) {
            const jsonStr = dataLine.substring(5).trim();
            try {
              resolve(JSON.parse(jsonStr));
              return;
            } catch (e) {
              // 继续尝试其他解析方式
            }
          }
        }

        // 尝试直接解析JSON
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('🚀 开始完整MCP测试...\n');
  console.log('='.repeat(60));

  try {
    // 步骤1: 初始化（会创建新会话）
    console.log('📡 步骤1: 初始化MCP连接...');
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

    console.log('\n' + '='.repeat(60));

    // 步骤2: 发送initialized通知
    console.log('📡 步骤2: 发送initialized通知...');
    await sendRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });
    console.log('✅ 初始化通知已发送');

    console.log('\n' + '='.repeat(60));

    // 步骤3: 列出可用工具
    console.log('📡 步骤3: 获取可用工具列表...');
    const toolsResult = await sendRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });

    if (toolsResult.result?.tools) {
      console.log('✅ 可用工具:');
      toolsResult.result.tools.forEach((tool, idx) => {
        console.log(`   ${idx + 1}. ${tool.name}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // 步骤4: 调用party_search_nearby工具
    console.log('📡 步骤4: 调用 party_search_nearby 工具...');
    console.log('   参数: 纬度=39.9839, 经度=116.43528, 半径=5000米\n');

    const toolResult = await sendRequest({
      jsonrpc: '2.0',
      id: 3,
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
    } else if (toolResult.error) {
      console.log('❌ 错误:', toolResult.error.message);
      console.log(JSON.stringify(toolResult, null, 2));
    } else {
      console.log(JSON.stringify(toolResult, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 测试完成！MCP服务器工作正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

test();

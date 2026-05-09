#!/usr/bin/env node
/**
 * MCP HTTP 传输测试脚本（使用MCP SDK）
 * 测试 hiito-mcp-server 的 party_search_nearby 工具
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import https from 'https';
import http from 'http';

const MCP_URL = 'https://hiito-mcp-server-254685-6-1375170188.sh.run.tcloudbase.com/mcp';
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

async function testMCP() {
  console.log('🚀 开始测试 MCP 连接（使用MCP SDK）...\n');

  try {
    // 创建MCP客户端
    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    // 创建HTTP传输层（带认证）
    const transport = new StreamableHTTPServerTransport({
      url: MCP_URL,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    console.log('📡 步骤1: 连接到MCP服务器...');
    await client.connect(transport);
    console.log('✅ 连接成功！\n');

    // 列出可用工具
    console.log('📡 步骤2: 获取可用工具列表...');
    const toolsResult = await client.listTools();
    console.log('✅ 可用工具:');
    toolsResult.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description?.substring(0, 60)}...`);
    });
    console.log();

    // 调用party_search_nearby工具
    console.log('📡 步骤3: 调用 party_search_nearby 工具...');
    console.log('   参数: latitude=39.9839, longitude=116.43528, radius=5000\n');
    
    const result = await client.callTool({
      name: 'party_search_nearby',
      arguments: {
        latitude: 39.9839,
        longitude: 116.43528,
        radius: 5000,
        limit: 20,
        response_format: 'markdown'
      }
    });

    console.log('✅ 工具调用成功！\n');
    console.log('📊 查询结果：');
    console.log('='.repeat(60));
    
    if (result.content) {
      result.content.forEach(item => {
        if (item.type === 'text') {
          console.log(item.text);
        }
      });
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    console.log('\n✅ 测试完成！MCP服务器工作正常。');
    console.log('='.repeat(60));

    // 关闭连接
    await client.close();

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  }
}

testMCP();

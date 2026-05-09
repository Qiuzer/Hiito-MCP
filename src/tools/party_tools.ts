/**
 * 派对相关 Tools
 *
 * 调用云函数获取派对信息，包括搜索附近派对。
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { callTargetFunction } from '../services/cloudbase.js';
import { formatPartyListMarkdown } from './formatters.js';
import { truncateResponse } from '../utils/errors.js';
import { z } from 'zod';
import { PartySearchNearbySchema } from '../schemas/index.js';

/**
 * Register party-related tools
 */
export function registerPartyTools(server: McpServer) {

  // Tool: party_search_nearby
  server.registerTool(
    'party_search_nearby',
    {
      title: 'Search Nearby Parties',
      description: `搜索附近的派对活动（车尾派对/螺母派对）。

根据经纬度和搜索半径，返回附近的派对列表，包含派对名称、地点、距离、时间、参与人数等信息。

Args:
  - latitude (number): 纬度，范围 -90 ~ 90，例如 39.9042（北京市中心）
  - longitude (number): 经度，范围 -180 ~ 180，例如 116.4074（北京市中心）
  - radius (number): 搜索半径（米），默认 5000，范围 100 ~ 50000
  - limit (number): 最多返回结果数，默认 20，范围 1 ~ 50
  - offset (number): 分页偏移量，默认 0
  - response_format ('markdown' | 'json'): 响应格式，默认 'markdown'

Returns:
  - Markdown 格式：格式化的派对列表，包含标题、地点、距离、时间、人数、状态等信息
  - JSON 格式：结构化数据数组，每个对象包含 title, address, start_time, distance, status 等字段
  - 分页信息：count, offset, has_more, next_offset

Examples:
  - 使用场景: "北京朝阳公园附近有什么派对" → latitude=39.9342, longitude=116.4103, radius=5000
  - 使用场景: "上海外滩周边10公里内的派对" → latitude=31.2304, longitude=121.4737, radius=10000
  - 不适用场景: 需要创建派对（此工具仅查询，不创建）

Error Handling:
  - 返回 "查询失败: ..." 如果 API 调用失败，请检查经纬度是否有效
  - 返回 "暂无派对活动" 如果指定范围内没有派对`,
      inputSchema: PartySearchNearbySchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartySearchNearbySchema.parse(args);
      const { latitude, longitude, radius, limit, offset, response_format } = parsedArgs;

      // 直接调用目标云函数，post → queryNearby 路由
      const result = await callTargetFunction<any>('post', {
        type: 'Query',
        $url: 'queryNearby',
        data: { latitude, longitude, radius, limit, offset },
      });

      if (result.code !== 0) {
        const errorMsg = result.msg || '未知错误';
        return {
          content: [{
            type: 'text',
            text: `查询失败: ${errorMsg}。\n\n排查建议：\n1. 确认经纬度是否在有效范围内（纬度 -90~90，经度 -180~180）\n2. 检查网络连接是否正常\n3. 确认 CloudBase 环境配置是否正确`,
          }],
          isError: true,
        };
      }

      const parties = result.data as unknown as Array<Record<string, unknown>>;
      const partiesList = Array.isArray(parties) ? parties : [];

      // 构建结构化输出
      const structuredOutput = {
        parties: partiesList.map((p) => ({
          title: p.title || '未知派对',
          address: p.address || '未知地点',
          start_time: p.start_time,
          distance: p.distance,
          status: p.status,
          current_participants: p.current_participants || 0,
          max_participants: p.max_participants,
          url_scheme: p.url_scheme,
          url_link: p.url_link,
        })),
        count: partiesList.length,
        offset: offset,
        has_more: partiesList.length === limit,
        next_offset: partiesList.length === limit ? offset + limit : undefined,
      };

      const formattedText = formatPartyListMarkdown(partiesList, response_format);
      return {
        content: [{
          type: 'text',
          text: truncateResponse(formattedText),
        }],
        structuredContent: structuredOutput,
      };
    }
  );

}

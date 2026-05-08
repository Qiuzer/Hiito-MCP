/**
 * 派对搜索 Tool
 *
 * 调用 discover 云函数的 queryNearby 路由，
 * 根据经纬度搜索附近的派对活动。
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
      description: '搜索附近的派对活动。根据经纬度和搜索半径，返回附近的派对列表，包含派对名称、地点、距离等信息。适用于"附近有什么派对"、"XX附近的车尾派对"等场景。',
      inputSchema: PartySearchNearbySchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartySearchNearbySchema.parse(args);
      const { latitude, longitude, radius, limit, offset, response_format } = parsedArgs;

      // 直接调用目标云函数，discover → queryNearby 路由
      const result = await callTargetFunction('discover', {
        $url: 'queryNearby',
        data: { latitude, longitude, radius, limit, offset },
      });

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      const formattedText = formatPartyListMarkdown(result.data as unknown as Array<Record<string, unknown>>, response_format);
      return {
        content: [{
          type: 'text',
          text: truncateResponse(formattedText),
        }],
      };
    }
  );

}

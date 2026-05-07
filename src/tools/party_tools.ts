/**
 * Party-related MCP Tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { queryNearbyParties, queryPartyDetail, queryPartiesByOrganizer, queryUpcomingParties } from '../services/cloudbase.js';
import { formatPartyListMarkdown, formatPartyDetailMarkdown, ResponseFormat } from './formatters.js';
import { z } from 'zod';
import {
  PartySearchNearbySchema,
  PartyGetDetailSchema,
  PartyListByOrganizerSchema,
  PartyListUpcomingSchema,
} from '../schemas/index.js';

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
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartySearchNearbySchema.parse(args);
      const { latitude, longitude, radius, limit, offset, response_format } = parsedArgs;
      const result = await queryNearbyParties({ latitude, longitude, radius, limit, offset });

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatPartyListMarkdown(result.data as unknown as Array<Record<string, unknown>>, response_format),
        }],
      };
    }
  );


  // Tool: party_get_detail
  server.registerTool(
    'party_get_detail',
    {
      description: '获取派对的详细信息，包括活动时间、地点、主办方、报名人数等。适用于需要了解某个派对的完整信息场景。',
      inputSchema: PartyGetDetailSchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartyGetDetailSchema.parse(args);
      const { party_id, response_format } = parsedArgs;
      const result = await queryPartyDetail(party_id);

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatPartyDetailMarkdown(result.data as Record<string, unknown>, response_format),
        }],
      };
    }
  );


  // Tool: party_list_by_organizer
  server.registerTool(
    'party_list_by_organizer',
    {
      description: '查询指定主办方举办的所有派对活动，按时间降序排列。适用于查找某个车主或组织的历史派对。',
      inputSchema: PartyListByOrganizerSchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartyListByOrganizerSchema.parse(args);
      const { organizer_id, limit, offset, response_format } = parsedArgs;
      const result = await queryPartiesByOrganizer({ organizer_id, limit, offset });

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatPartyListMarkdown(result.data as unknown as Array<Record<string, unknown>>, response_format),
        }],
      };
    }
  );


  // Tool: party_list_upcoming
  server.registerTool(
    'party_list_upcoming',
    {
      description: '获取近期即将开始的所有派对，按开始时间升序排列。适用于"最近有什么派对"、"本周派对推荐"等场景。',
      inputSchema: PartyListUpcomingSchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartyListUpcomingSchema.parse(args);
      const { limit, offset, days_ahead, response_format } = parsedArgs;
      const result = await queryUpcomingParties({ limit, offset, days_ahead });

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatPartyListMarkdown(result.data as unknown as Array<Record<string, unknown>>, response_format),
        }],
      };
    }
  );

}

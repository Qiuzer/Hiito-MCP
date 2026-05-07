/**
 * Deep Link and Organizer MCP Tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { generatePartyDeepLink, queryOrganizerInfo } from '../services/cloudbase.js';
import { formatDeepLinkResponse, formatOrganizerMarkdown, ResponseFormat } from './formatters.js';
import { z } from 'zod';
import {
  PartyGenerateDeepLinkSchema,
  OrganizerGetInfoSchema,
} from '../schemas/index.js';

/**
 * Register link and organizer tools
 */
export function registerLinkAndOrganizerTools(server: McpServer) {

  // Tool: party_generate_deep_link
  server.registerTool(
    'party_generate_deep_link',
    {
      description: '为指定派对生成打开小程序的短链接（URL Scheme 或 URL Link）。URL Scheme 可在微信内直接打开小程序，URL Link 可在浏览器中打开。建议同时生成两种链接以满足不同场景。',
      inputSchema: PartyGenerateDeepLinkSchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartyGenerateDeepLinkSchema.parse(args);
      const { party_id, link_type, path, query, expire_minutes } = parsedArgs;
      const result = await generatePartyDeepLink({
        party_id,
        link_type,
        path,
        query,
        expire_minutes,
      });

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `链接生成失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatDeepLinkResponse(result as unknown as Record<string, unknown>),
        }],
      };
    }
  );

  // Tool: organizer_get_info
  server.registerTool(
    'organizer_get_info',
    {
      description: '获取主办方的完整资料，包括名称、简介、认证状态、累计举办的派对数和参与人数等。适用于需要了解某个主办方可信度的场景。',
      inputSchema: OrganizerGetInfoSchema,
      outputSchema: z.object({ content: z.object({ type: z.literal('string') }) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = OrganizerGetInfoSchema.parse(args);
      const { organizer_id, response_format } = parsedArgs;
      const result = await queryOrganizerInfo(organizer_id);

      if (result.code !== 0) {
        return { content: [{ type: 'text', text: `查询失败: ${result.msg}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: formatOrganizerMarkdown(result.data as Record<string, unknown>, response_format),
        }],
      };
    }
  );
}

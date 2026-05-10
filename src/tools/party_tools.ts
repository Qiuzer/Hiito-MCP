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
      description: `搜索附近的派对活动（车尾派对/螺母派对）。根据经纬度和搜索半径返回派对列表，包含名称、地点、距离、时间等信息。\n\n示例：\n- "北京朝阳公园附近有什么派对" → latitude=39.9342, longitude=116.4103, radius=5000\n- "上海外滩周边10公里内的派对" → latitude=31.2304, longitude=121.4737, radius=10000\n\n注意：仅支持查询，不支持创建派对。`,
      inputSchema: PartySearchNearbySchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const parsedArgs = PartySearchNearbySchema.parse(args);
      const { latitude, longitude, radius, limit, offset, skip, response_format } = parsedArgs;

      // === 输入参数规范化 ===
      // 1. 经纬度精度统一为 6 位小数（约 0.1 米，消除浮点精度差异）
      const normalizedLat = Number(latitude.toFixed(6));
      const normalizedLng = Number(longitude.toFixed(6));

      // 2. 分页参数去歧义：skip 显式传入时优先，否则用 offset
      //    避免 Math.max 在两者都为 0 时语义不明确
      const normalizedOffset = skip > 0 ? skip : offset;

      // 3. 生成确定性请求 ID，便于后端缓存/去重（需后端配合消费）
      const requestId = [
        'psn',
        normalizedLat,
        normalizedLng,
        radius,
        limit,
        normalizedOffset,
      ].join('_');

      // 调用目标云函数，post → QueryOrganizerForMCP 路由
      const result = await callTargetFunction<any>('post', {
        type: 'Query',
        $url: 'QueryOrganizerForMCP',
        request_id: requestId,
        data: {
          latitude: normalizedLat,
          longitude: normalizedLng,
          radius,
          limit,
          offset: normalizedOffset,
        },
      });

      console.log('[DEBUG] callTargetFunction result:', JSON.stringify(result, null, 2));

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

      // 兼容后端返回格式：支持纯数组或 { list/data, total } 包装对象
      const rawData = result.data;
      let partiesList: Array<Record<string, unknown>> = [];

      if (Array.isArray(rawData)) {
        partiesList = rawData;
      } else if (rawData && typeof rawData === 'object') {
        const dataObj = rawData as Record<string, unknown>;
        if (Array.isArray(dataObj.list)) {
          partiesList = dataObj.list as Array<Record<string, unknown>>;
        } else if (Array.isArray(dataObj.data)) {
          partiesList = dataObj.data as Array<Record<string, unknown>>;
        }
      }

      console.log('[DEBUG] partiesList count:', partiesList.length);

      const formattedText = formatPartyListMarkdown(partiesList, response_format);

      return {
        content: [{
          type: 'text',
          text: truncateResponse(formattedText),
        }],
      };
    }
  );

}
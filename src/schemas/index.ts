/**
 * Zod Schemas for MCP Tool Input Validation
 */

import { z } from 'zod';
import { ResponseFormat } from '../types.js';

// Party Search Nearby
export const PartySearchNearbySchema = z.object({
  latitude: z.number()
    .min(-90, '纬度范围 -90 ~ 90')
    .max(90)
    .describe('纬度，例如 39.9042（北京市中心）'),
  longitude: z.number()
    .min(-180, '经度范围 -180 ~ 180')
    .max(180)
    .describe('经度，例如 116.4074（北京市中心）'),
  radius: z.number()
    .min(100, '半径最小 100 米')
    .max(50000, '半径最大 50 公里')
    .default(5000)
    .describe('搜索半径，单位：米，默认 5000（5公里）'),
  limit: z.number()
    .int('limit 必须为整数')
    .min(1)
    .max(50)
    .default(20)
    .describe('最多返回结果数，默认 20，最大 50'),
  offset: z.number()
    .int('offset 必须为整数')
    .min(0)
    .default(0)
    .describe('分页偏移量，默认 0'),
  skip: z.number()
    .int('skip 必须为整数')
    .min(0)
    .default(0)
    .describe('跳过记录数，默认 0'),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Export type inferences
export type PartySearchNearbyInput = z.infer<typeof PartySearchNearbySchema>;

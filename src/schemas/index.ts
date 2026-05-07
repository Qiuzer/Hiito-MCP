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
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Party Get Detail
export const PartyGetDetailSchema = z.object({
  party_id: z.string()
    .min(1, 'party_id 不能为空')
    .describe('派对 ID'),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Party List By Organizer
export const PartyListByOrganizerSchema = z.object({
  organizer_id: z.string()
    .min(1, 'organizer_id 不能为空')
    .describe('主办方用户 ID'),
  limit: z.number().int().min(1).max(50).default(20)
    .describe('返回数量上限，默认 20'),
  offset: z.number().int().min(0).default(0)
    .describe('分页偏移量，默认 0'),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Party List Upcoming
export const PartyListUpcomingSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20)
    .describe('返回数量上限，默认 20'),
  offset: z.number().int().min(0).default(0)
    .describe('分页偏移量，默认 0'),
  days_ahead: z.number().int().min(1).max(90).default(7)
    .describe('查询未来 N 天内的派对，默认 7 天'),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Party Generate Deep Link
export const PartyGenerateDeepLinkSchema = z.object({
  party_id: z.string()
    .min(1, 'party_id 不能为空')
    .describe('派对 ID'),
  link_type: z.enum(['scheme', 'link', 'both'])
    .default('both')
    .describe('生成类型：scheme=URL Scheme，link=小程序链接，both=两种都生成'),
  path: z.string().optional()
    .describe('小程序页面路径，默认 /pages/index/index'),
  query: z.record(z.string()).optional()
    .describe('页面参数，例如 { id: "party_xxx001" }'),
  expire_minutes: z.number().int().min(1).max(43200).default(1440)
    .describe('URL Link 有效期（分钟），默认 1440（24小时）'),
}).strict();

// Organizer Get Info
export const OrganizerGetInfoSchema = z.object({
  organizer_id: z.string()
    .min(1, 'organizer_id 不能为空')
    .describe('主办方用户 ID'),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe('响应格式，默认 MARKDOWN'),
}).strict();

// Export type inferences
export type PartySearchNearbyInput = z.infer<typeof PartySearchNearbySchema>;
export type PartyGetDetailInput = z.infer<typeof PartyGetDetailSchema>;
export type PartyListByOrganizerInput = z.infer<typeof PartyListByOrganizerSchema>;
export type PartyListUpcomingInput = z.infer<typeof PartyListUpcomingSchema>;
export type PartyGenerateDeepLinkInput = z.infer<typeof PartyGenerateDeepLinkSchema>;
export type OrganizerGetInfoInput = z.infer<typeof OrganizerGetInfoSchema>;

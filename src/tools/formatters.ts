/**
 * Response Formatters
 */

import { ResponseFormat } from '../types.js';
import { RESPONSE_CONFIG } from '../utils/errors.js';

// Re-export for backward compatibility (tools import from here)
export { ResponseFormat };

/**
 * Format party list to specified format
 */
export function formatPartyListMarkdown(
  parties: Array<Record<string, unknown>>,
  format: ResponseFormat
): string {
  if (!parties || parties.length === 0) {
    return '暂无派对活动';
  }

  if (format === ResponseFormat.JSON) {
    return JSON.stringify(parties, null, 2);
  }

  const lines = ['## 🎉 附近派对活动\n'];

  for (const party of parties) {
    const title = party.title || '未知派对';
    const address = party.address || '未知地点';
    const startTime = formatTime(party.start_time as string);
    const distance = party.distance ? `${Math.round(party.distance as number)}m` : '距离未知';
    const status = getStatusText(party.status as string);
    const participants = party.current_participants || 0;
    const maxParticipants = party.max_participants || '∞';

    lines.push(`### ${title}`);
    lines.push(`- 📍 **地点**: ${address}`);
    lines.push(`- 📏 **距离**: ${distance}`);
    lines.push(`- 🕐 **时间**: ${startTime}`);
    lines.push(`- 👥 **人数**: ${participants}/${maxParticipants}`);
    lines.push(`- 🏷️ **状态**: ${status}`);

    if (party.url_scheme || party.url_link) {
      lines.push('\n#### 🔗 一键参加派对');
      if (party.url_scheme) {
        lines.push(`[打开微信派对](${party.url_scheme})`);
      }
      if (party.url_link) {
        lines.push(`[分享链接](${party.url_link})`);
      }
    }

    lines.push('\n---\n');
  }

  return lines.join('\n');
}

/**
 * Format party detail to specified format
 */
export function formatPartyDetailMarkdown(
  party: Record<string, unknown> | undefined,
  format: ResponseFormat
): string {
  if (!party) {
    return '未找到派对信息';
  }

  if (format === ResponseFormat.JSON) {
    return JSON.stringify(party, null, 2);
  }

  const title = party.title || '未知派对';
  const description = party.description || '暂无描述';
  const address = party.address || '未知地点';
  const startTime = formatTime(party.start_time as string);
  const endTime = formatTime(party.end_time as string);
  const status = getStatusText(party.status as string);
  const participants = party.current_participants || 0;
  const maxParticipants = party.max_participants || '∞';
  const organizerId = party.organizer_id || '';

  const lines: string[] = [];
  lines.push(`# ${title}\n`);
  lines.push(`## 📝 活动描述\n${description}\n`);
  lines.push('## 📋 活动详情\n');
  lines.push(`- 📍 **地点**: ${address}`);
  lines.push(`- 🕐 **开始**: ${startTime}`);
  lines.push(`- 🕐 **结束**: ${endTime}`);
  lines.push(`- 👥 **人数**: ${participants}/${maxParticipants}`);
  lines.push(`- 🏷️ **状态**: ${status}`);
  lines.push(`- 🆔 **派对ID**: ${party._id}`);

  if (organizerId) {
    lines.push(`- 👤 **主办方ID**: ${organizerId}`);
  }

  // Deep links
  lines.push('\n## 🔗 参与方式\n');
  if (party.url_scheme) {
    lines.push(`[打开微信参加派对](${party.url_scheme})`);
  }
  if (party.url_link) {
    lines.push(`[分享给好友](${party.url_link})`);
  }

  if (!party.url_scheme && !party.url_link) {
    lines.push('（链接生成中...）');
  }

  return lines.join('\n');
}

/**
 * Format organizer info to specified format
 */
export function formatOrganizerMarkdown(
  organizer: Record<string, unknown> | undefined,
  format: ResponseFormat
): string {
  if (!organizer) {
    return '未找到主办方信息';
  }

  if (format === ResponseFormat.JSON) {
    return JSON.stringify(organizer, null, 2);
  }

  const name = organizer.name || '未知主办方';
  const bio = organizer.bio || '暂无简介';
  const verified = organizer.verified ? '✅ 已认证' : '❌ 未认证';
  const totalParties = organizer.total_parties || 0;
  const totalParticipants = organizer.total_participants || 0;

  const lines: string[] = [];
  lines.push(`# ${name}\n`);
  lines.push(`> ${bio}\n`);
  lines.push('## 📊 数据统计\n');
  lines.push(`- 🎉 **累计派对**: ${totalParties} 场`);
  lines.push(`- 👥 **累计参与**: ${totalParticipants} 人次`);
  lines.push(`- ✅ **认证状态**: ${verified}`);
  lines.push(`- 🆔 **主办方ID**: ${organizer._id}`);

  return lines.join('\n');
}

/**
 * Format deep link response
 */
export function formatDeepLinkResponse(
  result: Record<string, unknown> | undefined
): string {
  if (!result || result.code !== 0) {
    return `❌ 链接生成失败: ${result?.msg || '未知错误'}`;
  }

  const data = result.data as Record<string, unknown>;
  const lines: string[] = [];

  lines.push('## 🔗 派对链接已生成\n');

  if (data.url_scheme) {
    lines.push('### 微信内打开（推荐）');
    lines.push(`[一键参加派对](${data.url_scheme})\n`);
  }

  if (data.wechat_link) {
    lines.push('### 分享链接（浏览器可用）');
    lines.push(`[分享给好友](${data.wechat_link})\n`);
  }

  if (data.expire_time) {
    lines.push(`> ⏰ 链接有效期至: ${formatTime(data.expire_time as string)}`);
  }

  return lines.join('\n');
}

/**
 * Format time string to readable format
 */
function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '时间未知';
  try {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timeStr;
  }
}

/**
 * Get status display text
 */
function getStatusText(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    active: '🟢 报名中',
    pending: '🟡 即将开始',
    ended: '⚪ 已结束',
    cancelled: '🔴 已取消',
  };
  return statusMap[status || ''] || status || '未知';
}

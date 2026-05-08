/**
 * Response Formatters
 */

import { ResponseFormat } from '../types.js';

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

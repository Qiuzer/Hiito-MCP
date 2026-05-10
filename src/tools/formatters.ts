/**
 * Response Formatters - Optimized for Idempotency and Robustness
 */

import { ResponseFormat } from '../types.js';

/**
 * 派对状态配置（静态映射，确保输出一致性）
 */
const STATUS_MAP: Record<string, string> = {
  active: '🟢 报名中',
  pending: '🟡 即将开始',
  ended: '⚪ 已结束',
  cancelled: '🔴 已取消',
};

/**
 * 将派对列表格式化为指定输出格式
 * 
 * 优化点：
 * 1. 幂等排序：对输入数据按距离或 ID 排序，确保相同数据源生成的 Markdown 顺序一致。
 * 2. 内存效率：使用数组 push 结合 join，减少字符串拼接性能开销。
 * 3. 增强健壮性：对缺失字段进行更稳固的默认值处理。
 */
export function formatPartyListMarkdown(
  parties: Array<Record<string, any>>, // 统一使用 any 以便后续类型转换
  format: ResponseFormat
): string {
  // 1. 空值守卫
  if (!Array.isArray(parties) || parties.length === 0) {
    return '暂无派对活动';
  }

  // 2. 幂等性保证：强制排序
  // 防止因后端数据库返回顺序随机导致生成的字符串 hash 值改变
  const sortedParties = [...parties].sort((a, b) => {
    const distA = Number(a.distance) || 0;
    const distB = Number(b.distance) || 0;
    return distA - distB || String(a._id).localeCompare(String(b._id));
  });

  // 3. JSON 格式快速返回
  if (format === ResponseFormat.JSON) {
    return JSON.stringify(sortedParties, null, 2);
  }

  // 4. 构建 Markdown 列表
  const result: string[] = ['## 🎉 附近派对活动\n'];

  sortedParties.forEach((party) => {
    // 提取字段 - 兼容多种后端返回格式
    // 后端可能返回: { name, address: string|object, operatingHours, ... }
    // 或: { title, address: string, start_time, ... }
    const title = party.name || party.title || '未知派对';
    
    // 地址可能是字符串或嵌套对象 { street, city, country, postalCode }
    const address = typeof party.address === 'object' && party.address !== null
      ? `${(party.address as any).street || ''}, ${(party.address as any).city || ''}`.replace(/^, |, $/g, '') || '未知地点'
      : (party.address || '未知地点');
    
    // 时间可能是 start_time 或 operatingHours: { date, startTime, endTime }
    let startTimeRaw = party.start_time;
    if (!startTimeRaw && party.operatingHours) {
      const oh = party.operatingHours as any;
      startTimeRaw = oh.startTime ? `${oh.date} ${oh.startTime}` : oh.date;
    }

    const distance = party.distance;
    const url_scheme = party.url_scheme;
    const url_link = party.url_link;

    const startTimeStr = formatTime(startTimeRaw);
    const distanceStr = typeof distance === 'number' ? `${Math.round(distance)}m` : '距离未知';

    // 使用模板字符串构建内容块
    const partyBlock = [
      `### ${title}`,
      `- 📍 **地点**: ${address}`,
      `- 📏 **距离**: ${distanceStr}`,
      `- 🕐 **时间**: ${startTimeStr}`,
    ];

    // 处理链接部分 - 只在有 URL 时输出
    if (url_scheme || url_link) {
      partyBlock.push('\n#### 🔗 一键参加派对');
      if (url_scheme) partyBlock.push(`[打开微信派对](${url_scheme})`);
      if (url_link) partyBlock.push(`[分享链接](${url_link})`);
    }

    result.push(partyBlock.join('\n'));
    result.push('\n---\n');
  });

  // 移除最后一个多余的分隔符线并返回
  return result.join('\n').trim();
}

/**
 * 格式化时间字符串 - 纯函数
 * 确保时区处理的一致性（生产环境建议固定 zh-CN）
 */
function formatTime(timeStr: any): string {
  if (!timeStr) return '时间未知';

  const date = new Date(timeStr);
  // 检查无效日期
  if (isNaN(date.getTime())) return String(timeStr);

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false // 24小时制保证格式对齐
  });
}

/**
 * 获取状态展示文本 - 纯函数
 */
function getStatusText(status: string | undefined): string {
  if (!status) return '未知';
  return STATUS_MAP[status] || `🔍 ${status}`;
}
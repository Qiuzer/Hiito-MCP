/**
 * Hiito MCP Server - Response Utilities
 */

/**
 * Response truncation utility
 */
export const RESPONSE_CONFIG = {
  CHARACTER_LIMIT: parseInt(process.env.CHARACTER_LIMIT || '25000', 10),
  TRUNCATION_SUFFIX: '\n\n---\n*⚠️ 响应已被截断，如需完整信息请缩小查询范围*',
};

/**
 * Truncate response text to respect character limit
 */
export function truncateResponse(text: string, limit?: number): string {
  const effectiveLimit = limit ?? RESPONSE_CONFIG.CHARACTER_LIMIT;
  const suffix = RESPONSE_CONFIG.TRUNCATION_SUFFIX;
  const suffixLength = suffix.length + 10; // Extra space for ellipsis

  if (text.length <= effectiveLimit) {
    return text;
  }

  // Leave room for suffix
  return text.slice(0, effectiveLimit - suffixLength) + '...' + suffix;
}

/**
 * Log error without leaking sensitive information
 */
export function logError(context: string, error: unknown): void {
  if (error instanceof Error) {
    // Only log error class name and message, not stack traces in production
    const logEntry = process.env.NODE_ENV === 'production'
      ? `[${context}] ${error.name}: ${error.message}`
      : `[${context}] ${error.name}: ${error.message}\n${error.stack}`;
    console.error(logEntry);
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }
}

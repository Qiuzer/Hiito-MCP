/**
 * Hiito MCP Server - Unified Error Handling
 */

export enum ErrorCode {
  // 4xx Client Errors
  INVALID_PARAMS = 40001,
  AUTH_FAILED = 40101,
  AUTH_REQUIRED = 40102,
  RATE_LIMITED = 42901,
  SESSION_NOT_FOUND = 40401,

  // 5xx Server Errors
  INTERNAL_ERROR = 50001,
  TIMEOUT_ERROR = 50002,
  UPSTREAM_ERROR = 50003,
}

/**
 * Custom MCP Error class
 */
export class MCPError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'MCPError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

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
 * Create standardized error responses
 */
export function createErrorResponse(code: ErrorCode, message: string, statusCode?: number) {
  return new MCPError(code, message, statusCode);
}

/**
 * Log error without leaking sensitive information
 */
export function logError(context: string, error: unknown): void {
  if (error instanceof MCPError) {
    console.error(`[${context}] MCPError: code=${error.code}, message=${error.message}`);
  } else if (error instanceof Error) {
    // Only log error class name and message, not stack traces in production
    const logEntry = process.env.NODE_ENV === 'production'
      ? `[${context}] ${error.name}: ${error.message}`
      : `[${context}] ${error.name}: ${error.message}\n${error.stack}`;
    console.error(logEntry);
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }
}

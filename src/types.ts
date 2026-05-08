/**
 * Hiito MCP Server Type Definitions
 */

// API Response wrapper
export interface CloudFunctionResponse<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

// Response format options
export enum ResponseFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
  TEXT = 'text'
}

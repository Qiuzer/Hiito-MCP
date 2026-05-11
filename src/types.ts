export interface CloudFunctionResponse<T> {
  code: number | string;
  msg: string;
  data?: T; // 将其变为可选（添加问号）
  upstream_code?: string;
}

export enum ResponseFormat {
  MARKDOWN = 'markdown',
  JSON = 'json'
}

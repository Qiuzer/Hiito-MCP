/**
 * CloudBase Service - Cross-environment function invocation
 *
 * MCP 环境不存储数据，所有查询通过 callTargetFunction 调用目标环境的云函数。
 * Tool 层直接调用此函数并传入正确的 functionName、$url 路由和 data 参数。
 */

import CloudBase from '@cloudbase/node-sdk';
import type { CloudFunctionResponse } from '../types.js';

// Allowed cloud function names (whitelist for security)
const ALLOWED_FUNCTIONS = new Set(['discover']);

// Lazy-initialized CloudBase app (avoids invalid init if env not set at import time)
let appInstance: ReturnType<typeof CloudBase.init> | null = null;

function getApp(): ReturnType<typeof CloudBase.init> {
  if (!appInstance) {
    const envId = process.env.TARGET_ENV_ID;
    if (!envId) {
      throw new Error('TARGET_ENV_ID is not configured');
    }
    appInstance = CloudBase.init({ env: envId });
  }
  return appInstance;
}

/**
 * Call a cloud function in the target environment (hiito)
 *
 * @param functionName - 目标云函数名称（需在白名单内：discover / organizer / platform）
 * @param params.$url - 云函数内部路由（由目标云函数解析）
 * @param params.data - 传递给路由的业务参数
 * @returns CloudFunctionResponse<T>
 *
 * @example
 * // 查询附近派对
 * const result = await callTargetFunction('discover', {
 *   $url: 'queryNearby',
 *   data: { latitude: 39.9, longitude: 116.4, radius: 5000, limit: 20, offset: 0 },
 * });
 */
export async function callTargetFunction<T = unknown>(
  functionName: string,
  params: {
    $url: string;
    data?: Record<string, unknown>;
  }
): Promise<CloudFunctionResponse<T>> {
  // Validate function name against whitelist
  if (!ALLOWED_FUNCTIONS.has(functionName)) {
    console.warn(`⚠️ Blocked call to non-whitelisted function: ${functionName}`);
    return {
      code: -1,
      msg: `Unknown function: ${functionName}`,
    };
  }

  const app = getApp();

  try {
    const result = await app.callFunction({
      name: functionName,
      data: {
        ...params,
        // Force JSON response
        $dataType: 'json',
      },
    });

    // Handle response - CloudBase SDK returns data directly or with code wrapper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultData = result as any;

    // Check if it's a wrapped response (code/message/data)
    if (resultData.code !== undefined) {
      return resultData as CloudFunctionResponse<T>;
    }

    // If result is direct data, wrap it
    return {
      code: 0,
      msg: 'success',
      data: result as T,
    };
  } catch (error) {
    console.error(`Error calling ${functionName}:`, error);
    return {
      code: -1,
      msg: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

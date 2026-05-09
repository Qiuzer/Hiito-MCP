/**
 * CloudBase Service - Cross-environment function invocation
 * 
 * 核心逻辑：MCP 环境通过 Secret 鉴权，跨环境调用目标数据源环境的云函数。
 */

import CloudBase from '@cloudbase/node-sdk';
import type { CloudFunctionResponse } from '../types.js';

// --- 类型定义 ---

/**
 * 腾讯云 SDK callFunction 的标准返回结构
 */
interface CloudBaseCallResult {
  result: any;
  requestId: string;
}

// --- 常量配置 ---

// 允许调用的云函数白名单（安全策略）
const ALLOWED_FUNCTIONS = new Set(['post']);
const DEFAULT_TIMEOUT = 15000;

// 单例实例
let appInstance: ReturnType<typeof CloudBase.init> | null = null;

/**
 * 初始化或获取 CloudBase 实例 (单例模式)
 */
function getAppInstance(): ReturnType<typeof CloudBase.init> {
  if (appInstance) return appInstance;

  const {
    TARGET_ENV_ID: envId,
    TENCENT_SECRET_ID: secretId,
    TENCENT_SECRET_KEY: secretKey,
  } = process.env;

  if (!envId || !secretId || !secretKey) {
    throw new Error(
      `[Config Error] 缺少环境变量: ${!envId ? 'TARGET_ENV_ID ' : ''}${!secretId ? 'TENCENT_SECRET_ID ' : ''
      }${!secretKey ? 'TENCENT_SECRET_KEY' : ''}`
    );
  }

  appInstance = CloudBase.init({
    env: envId,
    secretId,
    secretKey,
    timeout: DEFAULT_TIMEOUT,
  });

  return appInstance;
}

/**
 * 响应标准化处理函数
 * 确保不论目标函数返回什么格式，MCP 获取到的结构始终统一
 */
function normalizeResponse<T>(rawResult: any): CloudFunctionResponse<T> {
  // 如果目标函数返回了标准结构 { code, data, msg }
  if (rawResult && typeof rawResult === 'object' && 'code' in rawResult) {
    return {
      code: rawResult.code,
      msg: rawResult.message || rawResult.msg || 'success',
      data: rawResult.data as T,
    };
  }

  // 如果目标函数直接返回了原始数据
  return {
    code: 0,
    msg: 'success',
    data: rawResult as T,
  };
}

/**
 * 跨环境调用目标函数
 * 
 * @param functionName 目标环境的云函数名 (如: 'post')
 * @param params 包含 $url (路由) 和 data (业务参数)
 */
export async function callTargetFunction<T = unknown>(
  functionName: string,
  params: {
    type?: string;
    $url: string;
    data?: Record<string, any>;
    request_id?: string;
  }
): Promise<CloudFunctionResponse<T>> {
  // 1. 安全校验
  if (!ALLOWED_FUNCTIONS.has(functionName)) {
    console.error(`[Security] 拦截非法函数调用: ${functionName}`);
    return { code: 403, msg: `Forbidden: Function ${functionName} not whitelisted` };
  }

  if (!params.$url) {
    return { code: 400, msg: 'Missing routing path ($url)' };
  }

  const app = getAppInstance();

  try {
    // 2. 执行跨环境调用
    // 使用类型断言解决 ts(7022) requestId 隐式 any 问题
    const { result, requestId } = (await app.callFunction({
      name: functionName,
      data: {
        ...params,
        $dataType: 'json',
      },
    })) as CloudBaseCallResult;

    // 日志记录，方便链路追踪
    console.log(`[RPC Success] ${functionName}@${params.$url} | RequestID: ${requestId}`);

    // 3. 返回标准化结果
    return normalizeResponse<T>(result);

  } catch (error: any) {
    // 4. 错误捕获与分类
    const errorMsg = error?.message || 'Unknown Internal Error';
    const errorCode = error?.code || 'INTERNAL_ERROR';

    console.error(`[RPC Error] Call ${functionName}@${params.$url} failed:`, {
      code: errorCode,
      message: errorMsg
    });

    return {
      code: errorCode === 'DATABASE_PERMISSION_DENIED' ? 403 : 500,
      msg: `Bridge Error: ${errorMsg}`,
    };
  }
}
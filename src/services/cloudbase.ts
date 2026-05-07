/**
 * CloudBase Service - Cross-environment function invocation
 * Uses CloudBase Node SDK for calling functions across environments
 */

import CloudBase from '@cloudbase/node-sdk';
import type { CloudFunctionResponse } from '../types.js';

// Allowed cloud function names (whitelist for security)
const ALLOWED_FUNCTIONS = new Set(['discover', 'organizer', 'platform']);

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
    // Call function using the SDK
    // Note: CloudBase Node SDK handles cross-env calls via the initialized app
    const result = await app.callFunction({
      name: functionName,
      data: {
        ...params,
        // Force JSON response
        $dataType: 'json'
      },
    });

    // Handle response - CloudBase SDK returns data directly or with code wrapper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultData = result as any;

    // Check if it's a wrapped response
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

/**
 * Query nearby parties using the discover cloud function
 */
export async function queryNearbyParties(params: {
  latitude: number;
  longitude: number;
  radius: number;
  limit: number;
  offset: number;
}) {
  return callTargetFunction('discover', {
    $url: 'queryNearby',
    data: params,
  });
}

/**
 * Query party detail by ID
 */
export async function queryPartyDetail(partyId: string) {
  return callTargetFunction('discover', {
    $url: 'queryDetail',
    data: { party_id: partyId },
  });
}

/**
 * Query parties by organizer
 */
export async function queryPartiesByOrganizer(params: {
  organizer_id: string;
  limit: number;
  offset: number;
}) {
  return callTargetFunction('discover', {
    $url: 'queryByOrganizer',
    data: params,
  });
}

/**
 * Query upcoming parties
 */
export async function queryUpcomingParties(params: {
  limit: number;
  offset: number;
  days_ahead: number;
}) {
  return callTargetFunction('discover', {
    $url: 'queryUpcoming',
    data: params,
  });
}

/**
 * Get organizer info
 */
export async function queryOrganizerInfo(organizerId: string) {
  return callTargetFunction('organizer', {
    $url: 'getInfo',
    data: { organizer_id: organizerId },
  });
}

/**
 * Generate deep link for party
 */
export async function generatePartyDeepLink(params: {
  party_id: string;
  link_type: 'scheme' | 'link' | 'both';
  path?: string;
  query?: Record<string, string>;
  expire_minutes?: number;
}) {
  return callTargetFunction('platform', {
    $url: 'generateDeepLink',
    data: params,
  });
}

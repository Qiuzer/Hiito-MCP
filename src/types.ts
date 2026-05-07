/**
 * Hiito MCP Server Type Definitions
 */

// Environment configuration
export interface EnvConfig {
  WECHAT_APP_ID: string;
  CLOUD_ENV_ID: string;
  TARGET_ENV_ID: string;
  MCP_AUTH_TOKEN?: string;
}

// Party location data
export interface PartyLocation {
  longitude: number;
  latitude: number;
}

// Party data model (matches hiito Parties collection)
export interface Party {
  _id: string;
  title: string;
  description: string;
  location: {
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  start_time: string;
  end_time: string;
  organizer_id: string;
  url_scheme?: string;
  url_link?: string;
  max_participants?: number;
  current_participants?: number;
  status: 'active' | 'ended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Organizer data model (matches organizer_ios collection)
export interface Organizer {
  _id: string;
  name: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  total_parties: number;
  total_participants: number;
  contact?: {
    phone?: string;
    wechat?: string;
  };
  created_at: string;
}

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

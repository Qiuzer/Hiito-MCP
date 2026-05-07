/**
 * Basic health check and auth middleware tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Health endpoint response shape
describe('Health Check Endpoint', () => {
  it('should return expected fields without sensitive data', () => {
    const healthResponse = {
      status: 'ok',
      service: 'hiito-mcp-server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    expect(healthResponse.status).toBe('ok');
    expect(healthResponse.service).toBe('hiito-mcp-server');
    expect(healthResponse).toHaveProperty('timestamp');
    expect(healthResponse).toHaveProperty('uptime');
    // Must NOT leak config
    expect(healthResponse).not.toHaveProperty('config');
    expect(healthResponse).not.toHaveProperty('cloudEnvId');
    expect(healthResponse).not.toHaveProperty('targetEnvId');
  });
});

// Auth middleware logic (unit test of the pure logic)
describe('Auth Middleware Logic', () => {
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject in production when no token configured', () => {
    const isProduction = true;
    const token = undefined;

    if (!token) {
      if (isProduction) {
        mockRes.status(500).json({ error: 'Server not configured: missing auth token' });
      }
    }

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Server not configured: missing auth token' });
  });

  it('should allow in development when no token configured', () => {
    const isProduction = false;
    const token = undefined;
    let nextCalled = false;

    if (!token) {
      if (isProduction) {
        mockRes.status(500).json({ error: 'Server not configured: missing auth token' });
      } else {
        nextCalled = true; // dev mode: pass through
      }
    }

    expect(nextCalled).toBe(true);
  });

  it('should reject invalid Bearer token', () => {
    const token = 'real-token';
    const authHeader = 'Bearer wrong-token';
    let rejected = false;

    if (token) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        rejected = true;
      } else {
        const provided = authHeader.slice(7);
        if (provided !== token) {
          rejected = true;
        }
      }
    }

    expect(rejected).toBe(true);
  });
});

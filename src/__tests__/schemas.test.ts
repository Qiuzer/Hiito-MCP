/**
 * Zod schema validation tests
 */

import { describe, it, expect } from 'vitest';
import { PartySearchNearbySchema } from '../schemas/index.js';

describe('PartySearchNearbySchema', () => {
  it('should validate valid input', () => {
    const result = PartySearchNearbySchema.parse({
      latitude: 39.9042,
      longitude: 116.4074,
      radius: 5000,
      limit: 20,
    });
    expect(result.latitude).toBe(39.9042);
    expect(result.longitude).toBe(116.4074);
  });

  it('should apply defaults', () => {
    const result = PartySearchNearbySchema.parse({
      latitude: 39.9042,
      longitude: 116.4074,
    });
    expect(result.radius).toBe(5000);
    expect(result.limit).toBe(20);
    expect(result.response_format).toBe('markdown');
  });

  it('should reject invalid latitude', () => {
    expect(() =>
      PartySearchNearbySchema.parse({ latitude: 999, longitude: 116 })
    ).toThrow();
  });
});

/**
 * Zod schema validation tests
 */

import { describe, it, expect } from 'vitest';
import {
  PartySearchNearbySchema,
  PartyGetDetailSchema,
  PartyListByOrganizerSchema,
  PartyListUpcomingSchema,
  PartyGenerateDeepLinkSchema,
  OrganizerGetInfoSchema,
} from '../schemas/index.js';

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

describe('PartyGetDetailSchema', () => {
  it('should validate valid party_id', () => {
    const result = PartyGetDetailSchema.parse({ party_id: 'abc123' });
    expect(result.party_id).toBe('abc123');
  });

  it('should reject empty party_id', () => {
    expect(() => PartyGetDetailSchema.parse({ party_id: '' })).toThrow();
  });

  it('should reject extra fields (strict mode)', () => {
    expect(() =>
      PartyGetDetailSchema.parse({ party_id: 'abc123', extra: 'field' })
    ).toThrow();
  });
});

describe('PartyGenerateDeepLinkSchema', () => {
  it('should validate with defaults', () => {
    const result = PartyGenerateDeepLinkSchema.parse({ party_id: 'p1' });
    expect(result.link_type).toBe('both');
    expect(result.expire_minutes).toBe(1440);
  });

  it('should accept scheme link type only', () => {
    const result = PartyGenerateDeepLinkSchema.parse({
      party_id: 'p1',
      link_type: 'scheme',
    });
    expect(result.link_type).toBe('scheme');
  });
});

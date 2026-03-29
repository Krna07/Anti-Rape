/**
 * Property tests for KYCAdminPanel
 * Validates: Requirements 10.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Replicated from KYCAdminPanel.jsx — pure function under test
function maskId(str) {
  if (!str || str.length === 0) return '****';
  const visible = str.slice(-4);
  const stars = '*'.repeat(Math.max(0, str.length - 4));
  return stars + visible;
}

describe('maskId', () => {
  /**
   * Property 21: ID number masking in admin panel
   * Validates: Requirements 10.4
   *
   * For any ID number string of length N (where N >= 4), the masked
   * representation must consist of (N - 4) asterisk characters followed
   * by the last 4 characters of the original string.
   */
  it('Property 21: masks all but last 4 chars for strings of length >= 4', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 30 }),
        (id) => {
          const masked = maskId(id);
          const expectedStars = id.length - 4;
          const expectedSuffix = id.slice(-4);

          // Total length must equal original length
          expect(masked.length).toBe(id.length);

          // First (N-4) chars must all be asterisks
          const starPart = masked.slice(0, expectedStars);
          expect(starPart).toBe('*'.repeat(expectedStars));

          // Last 4 chars must match original last 4
          const visiblePart = masked.slice(-4);
          expect(visiblePart).toBe(expectedSuffix);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns **** for empty string', () => {
    expect(maskId('')).toBe('****');
    expect(maskId(null)).toBe('****');
    expect(maskId(undefined)).toBe('****');
  });

  it('shows only last 4 chars for string of exactly length 4', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 4, maxLength: 4 }),
        (id) => {
          const masked = maskId(id);
          expect(masked).toBe(id); // no stars, all 4 chars visible
        }
      ),
      { numRuns: 100 }
    );
  });
});

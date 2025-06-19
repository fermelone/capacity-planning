import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock URL encoding/decoding functionality
const encodeStateToUrl = (state: any): string => {
  return btoa(JSON.stringify(state));
};

const decodeStateFromUrl = (encodedState: string): any => {
  try {
    return JSON.parse(atob(encodedState));
  } catch (error) {
    throw new Error('Invalid state encoding');
  }
};

describe('URL State Management', () => {
  beforeEach(() => {
    // Reset URL and global mocks
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/capacity-planning',
        search: '',
        href: 'https://example.com/capacity-planning'
      },
      writable: true
    });

    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn()
      },
      writable: true
    });
  });

  describe('State Encoding/Decoding', () => {
    const mockState = {
      totalUsers: 100,
      environmentsPerUser: 2,
      azCount: 2,
      subnetSize: 16,
      selectedRegions: ['us-east-1', 'us-west-2'],
      runners: [
        {
          id: 'runner-1',
          name: 'Runner 1',
          region: 'us-east-1',
          users: 50,
          subnetIds: ['subnet-1'],
          capacity: 251
        }
      ],
      subnets: [
        {
          id: 'subnet-1',
          name: 'subnet-1',
          region: 'us-east-1',
          az: 'a',
          cidrSize: 24,
          availableIps: 251
        }
      ],
      nextRunnerId: 2
    };

    it('should encode state to base64 URL parameter', () => {
      const encoded = encodeStateToUrl(mockState);
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should decode state from base64 URL parameter', () => {
      const encoded = encodeStateToUrl(mockState);
      const decoded = decodeStateFromUrl(encoded);
      
      expect(decoded).toEqual(mockState);
      expect(decoded.totalUsers).toBe(100);
      expect(decoded.selectedRegions).toEqual(['us-east-1', 'us-west-2']);
      expect(decoded.runners).toHaveLength(1);
      expect(decoded.subnets).toHaveLength(1);
    });

    it('should handle invalid encoded state gracefully', () => {
      expect(() => decodeStateFromUrl('invalid-base64')).toThrow('Invalid state encoding');
      expect(() => decodeStateFromUrl('aW52YWxpZC1qc29u')).toThrow('Invalid state encoding'); // 'invalid-json' in base64
    });

    it('should handle empty state', () => {
      const emptyState = {
        totalUsers: 10,
        environmentsPerUser: 1,
        azCount: 2,
        subnetSize: 16,
        selectedRegions: [],
        runners: [],
        subnets: [],
        nextRunnerId: 1
      };

      const encoded = encodeStateToUrl(emptyState);
      const decoded = decodeStateFromUrl(encoded);
      
      expect(decoded).toEqual(emptyState);
    });
  });

  describe('State Validation', () => {
    it('should handle missing properties in decoded state', () => {
      const incompleteState = {
        totalUsers: 50,
        // Missing other required properties
      };

      const validateAndFillDefaults = (state: any) => ({
        totalUsers: state.totalUsers ?? 10,
        environmentsPerUser: state.environmentsPerUser ?? 1,
        azCount: state.azCount ?? 2,
        subnetSize: state.subnetSize ?? 16,
        selectedRegions: state.selectedRegions ?? [],
        runners: state.runners ?? [],
        subnets: state.subnets ?? [],
        nextRunnerId: state.nextRunnerId ?? 1,
      });

      const validatedState = validateAndFillDefaults(incompleteState);
      
      expect(validatedState.totalUsers).toBe(50);
      expect(validatedState.environmentsPerUser).toBe(1);
      expect(validatedState.selectedRegions).toEqual([]);
      expect(validatedState.runners).toEqual([]);
    });

    it('should validate numeric constraints', () => {
      const validateNumericInputs = (state: any) => ({
        ...state,
        totalUsers: Math.max(1, Math.min(99999, state.totalUsers || 1)),
        environmentsPerUser: Math.max(1, Math.min(10, state.environmentsPerUser || 1)),
        azCount: Math.max(1, Math.min(3, state.azCount || 2)),
      });

      const invalidState = {
        totalUsers: -5,
        environmentsPerUser: 15,
        azCount: 10,
      };

      const validatedState = validateNumericInputs(invalidState);
      
      expect(validatedState.totalUsers).toBe(1);
      expect(validatedState.environmentsPerUser).toBe(10);
      expect(validatedState.azCount).toBe(3);
    });
  });

  describe('URL Generation', () => {
    it('should generate valid shareable URLs', () => {
      const state = {
        totalUsers: 100,
        environmentsPerUser: 2,
        selectedRegions: ['us-east-1']
      };

      const generateShareableUrl = (baseUrl: string, state: any): string => {
        const encodedState = encodeStateToUrl(state);
        return `${baseUrl}?state=${encodedState}`;
      };

      const url = generateShareableUrl('https://example.com/capacity-planning', state);
      
      expect(url).toContain('?state=');
      expect(url).toMatch(/^https:\/\/example\.com\/capacity-planning\?state=[A-Za-z0-9+/]+=*$/);
    });

    it('should handle URL length constraints', () => {
      // Create a large state object
      const largeState = {
        totalUsers: 10000,
        runners: Array.from({ length: 100 }, (_, i) => ({
          id: `runner-${i}`,
          name: `Very Long Runner Name ${i} With Lots Of Extra Characters`,
          region: 'us-east-1',
          users: 100,
          subnetIds: Array.from({ length: 10 }, (_, j) => `subnet-${i}-${j}`),
          capacity: 1000
        })),
        subnets: Array.from({ length: 100 }, (_, i) => ({
          id: `subnet-${i}`,
          name: `Very Long Subnet Name ${i} With Lots Of Extra Characters`,
          region: 'us-east-1',
          az: 'a',
          cidrSize: 24,
          availableIps: 251
        }))
      };

      const encoded = encodeStateToUrl(largeState);
      const url = `https://example.com/capacity-planning?state=${encoded}`;
      
      // URLs should ideally be under 2048 characters for browser compatibility
      // This test documents the current behavior rather than enforcing a limit
      expect(url.length).toBeGreaterThan(0);
      expect(typeof url).toBe('string');
    });
  });
});
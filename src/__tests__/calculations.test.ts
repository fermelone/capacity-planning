import { describe, it, expect } from 'vitest';

// Test data and helper functions
const calculateSubnetAvailableIPs = (cidrSize: number): number => {
  return Math.pow(2, 32 - cidrSize) - 5;
};

const calculateCapacity = (azCount: number, subnetSize: number): number => {
  const ipsPerSubnet = Math.pow(2, 32 - subnetSize) - 5;
  return ipsPerSubnet * azCount;
};

const distributeUsersAmongRunners = (runnerCount: number, totalUsers: number): number[] => {
  const baseUsers = Math.floor(totalUsers / runnerCount);
  const remainder = totalUsers % runnerCount;
  
  return Array.from({ length: runnerCount }, (_, index) => 
    baseUsers + (index < remainder ? 1 : 0)
  );
};

describe('Capacity Planning Calculations', () => {
  describe('Subnet IP Calculations', () => {
    it('should calculate available IPs correctly for different CIDR sizes', () => {
      expect(calculateSubnetAvailableIPs(24)).toBe(251); // 256 - 5
      expect(calculateSubnetAvailableIPs(20)).toBe(4091); // 4096 - 5
      expect(calculateSubnetAvailableIPs(16)).toBe(65531); // 65536 - 5
    });

    it('should handle edge cases for CIDR calculations', () => {
      expect(calculateSubnetAvailableIPs(32)).toBe(-4); // Edge case: single IP
      expect(calculateSubnetAvailableIPs(28)).toBe(11); // Small subnet
    });
  });

  describe('Capacity Calculations', () => {
    it('should calculate total capacity across availability zones', () => {
      expect(calculateCapacity(2, 24)).toBe(502); // 2 AZs × 251 IPs
      expect(calculateCapacity(3, 20)).toBe(12273); // 3 AZs × 4091 IPs
      expect(calculateCapacity(1, 16)).toBe(65531); // 1 AZ × 65531 IPs
    });

    it('should handle zero availability zones', () => {
      expect(calculateCapacity(0, 24)).toBe(0);
    });
  });

  describe('User Distribution Logic', () => {
    it('should distribute users evenly when divisible', () => {
      expect(distributeUsersAmongRunners(2, 100)).toEqual([50, 50]);
      expect(distributeUsersAmongRunners(4, 80)).toEqual([20, 20, 20, 20]);
      expect(distributeUsersAmongRunners(5, 25)).toEqual([5, 5, 5, 5, 5]);
    });

    it('should distribute remainder users to first runners when not divisible', () => {
      expect(distributeUsersAmongRunners(3, 100)).toEqual([34, 33, 33]);
      expect(distributeUsersAmongRunners(3, 10)).toEqual([4, 3, 3]);
      expect(distributeUsersAmongRunners(4, 15)).toEqual([4, 4, 4, 3]);
      expect(distributeUsersAmongRunners(7, 23)).toEqual([4, 4, 3, 3, 3, 3, 3]);
    });

    it('should handle edge cases', () => {
      expect(distributeUsersAmongRunners(1, 100)).toEqual([100]);
      expect(distributeUsersAmongRunners(100, 1)).toEqual([1, ...Array(99).fill(0)]);
      expect(distributeUsersAmongRunners(5, 0)).toEqual([0, 0, 0, 0, 0]);
    });

    it('should ensure total users are preserved', () => {
      const testCases = [
        { runners: 3, users: 100 },
        { runners: 7, users: 23 },
        { runners: 5, users: 17 },
        { runners: 10, users: 33 }
      ];

      testCases.forEach(({ runners, users }) => {
        const distribution = distributeUsersAmongRunners(runners, users);
        const total = distribution.reduce((sum, userCount) => sum + userCount, 0);
        expect(total).toBe(users);
      });
    });
  });

  describe('Utilization Calculations', () => {
    it('should calculate utilization percentage correctly', () => {
      const getUtilizationPercentage = (plannedUtilization: number, totalCapacity: number) => {
        return totalCapacity > 0 ? Math.round((plannedUtilization / totalCapacity) * 100) : 0;
      };

      expect(getUtilizationPercentage(50, 100)).toBe(50);
      expect(getUtilizationPercentage(75, 100)).toBe(75);
      expect(getUtilizationPercentage(150, 100)).toBe(150); // Over capacity
      expect(getUtilizationPercentage(33, 100)).toBe(33);
    });

    it('should handle zero capacity', () => {
      const getUtilizationPercentage = (plannedUtilization: number, totalCapacity: number) => {
        return totalCapacity > 0 ? Math.round((plannedUtilization / totalCapacity) * 100) : 0;
      };

      expect(getUtilizationPercentage(100, 0)).toBe(0);
    });
  });
});
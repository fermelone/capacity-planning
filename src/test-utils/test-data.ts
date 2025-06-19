import type { Runner, Subnet } from '../App';

export const mockSubnet: Subnet = {
  id: 'subnet-1',
  name: 'test-subnet',
  region: 'us-east-1',
  az: 'a',
  cidrSize: 24,
  availableIps: 251,
};

export const mockRunner: Runner = {
  id: 'runner-1',
  name: 'test-runner',
  region: 'us-east-1',
  users: 10,
  subnetIds: ['subnet-1'],
  capacity: 251,
};

export const createMockSubnet = (overrides: Partial<Subnet> = {}): Subnet => ({
  ...mockSubnet,
  id: 'subnet-' + Math.random().toString(36).substr(2, 9),
  ...overrides,
});

export const createMockRunner = (overrides: Partial<Runner> = {}): Runner => ({
  ...mockRunner,
  id: 'runner-' + Math.random().toString(36).substr(2, 9),
  ...overrides,
});

export const mockCapacityPlanningState = {
  totalUsers: 100,
  environmentsPerUser: 2,
  azCount: 2,
  subnetSize: 16,
  selectedRegions: ['us-east-1', 'us-west-2'],
  subnets: [
    createMockSubnet({ name: 'subnet-east-1a', region: 'us-east-1', az: 'a' }),
    createMockSubnet({ name: 'subnet-east-1b', region: 'us-east-1', az: 'b' }),
    createMockSubnet({ name: 'subnet-west-2a', region: 'us-west-2', az: 'a' }),
  ],
  runners: [
    createMockRunner({ name: 'runner-east', region: 'us-east-1', users: 60 }),
    createMockRunner({ name: 'runner-west', region: 'us-west-2', users: 40 }),
  ],
};
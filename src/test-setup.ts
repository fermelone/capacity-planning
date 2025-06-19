import '@testing-library/jest-dom';
import 'vitest-canvas-mock';
import { vi } from 'vitest';

// Mock external dependencies
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  })),
}));

vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn().mockReturnValue('mocked,csv,data'),
  },
}));

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-blob-url'),
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  writable: true,
  value: vi.fn(() => 'mocked-uuid-' + Math.random().toString(36).substr(2, 9)),
});

// Mock navigator.clipboard
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  configurable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch for URL shortening
global.fetch = vi.fn();
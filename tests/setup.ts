import { vi } from 'vitest';

// Mock IndexedDB for testing
const mockIndexedDB = (() => {
  let store: Record<string, any> = {};

  return {
    open: vi.fn(() => ({
      result: {
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn(),
            get: vi.fn((key: string) => ({ result: store[key] })),
            put: vi.fn((value: any, key: string) => { store[key] = value; }),
            delete: vi.fn((key: string) => { delete store[key]; }),
            getAll: vi.fn(() => ({ result: Object.values(store) })),
            clear: vi.fn(() => { store = {}; }),
          })),
        })),
      },
      onsuccess: null,
      onerror: null,
    })),
    deleteDatabase: vi.fn(),
  };
})();

// Setup global mocks
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock console methods for cleaner test output
globalThis.console = {
  ...console,
  // Uncomment to suppress logs in tests
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});
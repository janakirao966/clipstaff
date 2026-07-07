import { vi } from 'vitest';

// Stub standard browser APIs that jsdom might lack or throw errors on
if (typeof window !== 'undefined') {
  // Mock document.execCommand
  document.execCommand = vi.fn(() => {
    return false;
  });

  // Mock window.getSelection
  window.getSelection = vi.fn(() => {
    return {
      rangeCount: 1,
      getRangeAt: () => {
        const range = document.createRange();
        const div = document.createElement('div');
        const textNode = document.createTextNode('');
        div.appendChild(textNode);
        range.selectNodeContents(textNode);
        return range;
      },
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
    } as any;
  });
}

// In-memory storage mock
let store: Record<string, any> = {};

const storageListeners: Array<(changes: Record<string, any>, area: string) => void> = [];

const chromeMock = {
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result: Record<string, any> = {};
        if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = store[key];
          });
        } else if (typeof keys === 'string') {
          result[keys] = store[keys];
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach((key) => {
            result[key] = store[key] !== undefined ? store[key] : keys[key];
          });
        } else {
          Object.assign(result, store);
        }
        callback(result);
      }),
      set: vi.fn((items, callback) => {
        const changes: Record<string, any> = {};
        Object.keys(items).forEach((key) => {
          const oldValue = store[key];
          const newValue = items[key];
          store[key] = newValue;
          changes[key] = { oldValue, newValue };
        });

        // Trigger listeners
        storageListeners.forEach((listener) => listener(changes, 'local'));

        if (callback) callback();
      }),
      clear: vi.fn((callback) => {
        store = {};
        if (callback) callback();
      }),
    },
    onChanged: {
      addListener: vi.fn((listener) => {
        storageListeners.push(listener);
      }),
      removeListener: vi.fn((listener) => {
        const idx = storageListeners.indexOf(listener);
        if (idx !== -1) storageListeners.splice(idx, 1);
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn((message, responseCallback) => {
      if (responseCallback) {
        // Default instant response mock
        responseCallback({ status: 'ready', success: true });
      }
    }),
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    lastError: null,
  },
  tabs: {
    query: vi.fn((queryInfo, callback) => {
      if (callback) callback([{ id: 1, url: 'https://example.com' }]);
    }),
  },
  scripting: {
    executeScript: vi.fn((details, callback) => {
      if (callback) callback([{ result: 1 }]);
    }),
  },
};

// Stub the global chrome object
vi.stubGlobal('chrome', chromeMock);

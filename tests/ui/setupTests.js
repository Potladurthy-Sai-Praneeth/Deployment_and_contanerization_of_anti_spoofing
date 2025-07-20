// Jest setup file for UI tests
import '@testing-library/jest-dom';

// Additional test setup can be added here

// Make React available globally for tests
global.React = React;

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:8001';

// Mock WebRTC API for react-webcam
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
        getSettings: () => ({ width: 640, height: 480 }),
        getCapabilities: () => ({ width: { min: 320, max: 1920 }, height: { min: 240, max: 1080 } })
      }],
      active: true,
      id: 'mock-stream'
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      {
        deviceId: 'mock-camera-1',
        kind: 'videoinput',
        label: 'Mock Camera 1',
        groupId: 'mock-group-1'
      }
    ])
  }
});

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url://fake-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File and FileReader
global.File = class MockFile {
  constructor(fileBits, fileName, options) {
    this.name = fileName;
    this.size = fileBits.reduce((acc, bit) => acc + bit.length, 0);
    this.type = options?.type || '';
    this.lastModified = Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readAsDataURL = jest.fn((file) => {
      setTimeout(() => {
        this.result = 'data:image/jpeg;base64,mock-base64-data';
        this.onload?.({ target: { result: this.result } });
      }, 0);
    });
  }
};

// Mock window.confirm for delete operations
window.confirm = jest.fn(() => true);

// Mock console methods to reduce test noise
const originalConsole = { ...console };
console.warn = jest.fn((message) => {
  // Only show warnings that aren't React development warnings
  if (!message?.includes?.('Warning:') && !message?.includes?.('act()')) {
    originalConsole.warn(message);
  }
});

console.error = jest.fn((message) => {
  // Only show errors that aren't React development warnings
  if (!message?.includes?.('Warning:')) {
    originalConsole.error(message);
  }
});

// Mock axios to prevent network calls in tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress specific React warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

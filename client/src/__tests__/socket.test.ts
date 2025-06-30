import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocketSingleton, getWebSocketInstance } from '@/socket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', {
      code: code || 1000,
      reason: reason || '',
      wasClean: code === 1000
    });
    this.onclose?.(closeEvent);
  }

  // Test helper methods
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: any) {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(data)
    });
    this.onmessage?.(messageEvent);
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateClose(wasClean = false) {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent('close', {
      code: wasClean ? 1000 : 1006,
      wasClean
    });
    this.onclose?.(closeEvent);
  }
}

// Setup global WebSocket mock
global.WebSocket = MockWebSocket as any;

describe('WebSocketSingleton', () => {
  let instance: WebSocketSingleton;

  beforeEach(() => {
    // Reset singleton instance
    (WebSocketSingleton as any).instance = null;
    instance = getWebSocketInstance();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    instance.destroy();
    vi.useRealTimers();
  });

  it('should create a singleton instance', () => {
    const instance1 = getWebSocketInstance();
    const instance2 = getWebSocketInstance();
    expect(instance1).toBe(instance2);
  });

  it('should configure WebSocket URL and options', () => {
    const config = {
      url: 'ws://test.com',
      reconnectInterval: 5000,
      maxReconnectAttempts: 3
    };

    instance.configure(config);
    expect(() => instance.configure(config)).not.toThrow();
  });

  it('should connect to WebSocket successfully', async () => {
    instance.configure({ url: 'ws://localhost:8080' });
    
    const connectPromise = instance.connect();
    
    // Simulate successful connection
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    
    await expect(connectPromise).resolves.toBeUndefined();
    expect(instance.isConnected()).toBe(true);
  });

  it('should send messages when connected', async () => {
    instance.configure({ url: 'ws://localhost:8080' });
    const connectPromise = instance.connect();
    
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    const testMessage = { type: 'test', data: 'hello' };
    
    expect(() => instance.send(testMessage)).not.toThrow();
  });

  it('should throw error when sending message while disconnected', () => {
    const testMessage = { type: 'test', data: 'hello' };
    
    expect(() => instance.send(testMessage)).toThrow('WebSocket is not connected');
  });
});
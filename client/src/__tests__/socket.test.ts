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

  it('should handle connection errors', async () => {
    instance.configure({ url: 'ws://localhost:8080' });
    
    const connectPromise = instance.connect();
    
    // Simulate connection error
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateError();
    
    await expect(connectPromise).rejects.toThrow();
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

  it('should handle incoming messages', async () => {
    instance.configure({ url: 'ws://localhost:8080' });
    const connectPromise = instance.connect();
    
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    const messageHandler = vi.fn();
    instance.on('message', messageHandler);

    const testData = { type: 'response', data: 'test' };
    mockSocket.simulateMessage(testData);

    expect(messageHandler).toHaveBeenCalledWith(testData);
  });

  it('should handle reconnection on unexpected disconnect', async () => {
    instance.configure({ 
      url: 'ws://localhost:8080',
      reconnectInterval: 1000,
      maxReconnectAttempts: 2
    });
    
    const connectPromise = instance.connect();
    let mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    const reconnectSpy = vi.spyOn(instance, 'connect');
    
    // Simulate unexpected disconnect
    mockSocket.simulateClose(false); // wasClean = false
    
    // Fast-forward to trigger reconnection
    vi.advanceTimersByTime(1100);
    
    expect(reconnectSpy).toHaveBeenCalled();
  });

  it('should not reconnect on clean disconnect', () => {
    instance.configure({ url: 'ws://localhost:8080' });
    
    const reconnectSpy = vi.spyOn(instance, 'connect');
    
    // Clean disconnect
    instance.disconnect();
    
    vi.advanceTimersByTime(5000);
    
    expect(reconnectSpy).not.toHaveBeenCalled();
  });

  it('should stop reconnecting after max attempts', async () => {
    instance.configure({ 
      url: 'ws://localhost:8080',
      reconnectInterval: 1000,
      maxReconnectAttempts: 2
    });
    
    const connectPromise = instance.connect();
    let mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    // Simulate multiple failed reconnections
    for (let i = 0; i < 3; i++) {
      mockSocket.simulateClose(false);
      vi.advanceTimersByTime(1100);
    }

    expect((instance as any).reconnectAttempts).toBe(2);
  });

  it('should handle event listeners correctly', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    instance.on('test', handler1);
    instance.on('test', handler2);

    (instance as any).emit('test', 'data');

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');

    instance.off('test', handler1);
    (instance as any).emit('test', 'data2');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith('data2');
  });

  it('should handle once event listeners', () => {
    const handler = vi.fn();

    instance.once('test', handler);

    (instance as any).emit('test', 'data1');
    (instance as any).emit('test', 'data2');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('data1');
  });

  it('should return correct connection state', async () => {
    expect(instance.isConnected()).toBe(false);
    expect(instance.getConnectionState()).toBeNull();

    instance.configure({ url: 'ws://localhost:8080' });
    const connectPromise = instance.connect();
    
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    expect(instance.isConnected()).toBe(true);
    expect(instance.getConnectionState()).toBe(MockWebSocket.OPEN);
  });

  it('should clean up properly on destroy', async () => {
    instance.configure({ url: 'ws://localhost:8080' });
    const connectPromise = instance.connect();
    
    const mockSocket = (instance as any).socket as MockWebSocket;
    mockSocket.simulateOpen();
    await connectPromise;

    const handler = vi.fn();
    instance.on('test', handler);

    instance.destroy();

    expect(instance.isConnected()).toBe(false);
    expect((WebSocketSingleton as any).instance).toBeNull();
    
    // Handlers should be cleared
    (instance as any).emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });
});
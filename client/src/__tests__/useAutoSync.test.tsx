import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSync } from '@/hooks/useAutoSync';

// Mock WebSocket context
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

const mockWebSocketContext = {
  socket: mockSocket,
  isConnected: true,
  sendMessage: vi.fn(),
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}));

// Mock document.visibilityState
Object.defineProperty(document, 'visibilityState', {
  writable: true,
  value: 'visible'
});

Object.defineProperty(document, 'addEventListener', {
  writable: true,
  value: vi.fn()
});

Object.defineProperty(document, 'removeEventListener', {
  writable: true,
  value: vi.fn()
});

describe('useAutoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    document.visibilityState = 'visible';
    mockWebSocketContext.socket = mockSocket;
    mockWebSocketContext.isConnected = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should emit initial sync when hook is mounted', () => {
    renderHook(() => useAutoSync());
    
    expect(mockSocket.emit).toHaveBeenCalledWith('room:sync');
  });

  it('should not emit sync when disabled', () => {
    renderHook(() => useAutoSync(false));
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should emit sync at specified intervals', () => {
    renderHook(() => useAutoSync(true, 5000));
    
    // Initial sync
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(mockSocket.emit).toHaveBeenCalledTimes(3);
  });

  it('should use default interval of 10000ms when not specified', () => {
    renderHook(() => useAutoSync());
    
    // Initial sync
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    
    // Fast-forward time by default interval
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
  });

  it('should not sync when tab is hidden', () => {
    // Mock hidden tab
    document.visibilityState = 'hidden';
    
    renderHook(() => useAutoSync(true, 1000));
    
    // Should not emit initial sync when hidden
    expect(mockSocket.emit).not.toHaveBeenCalled();
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    // Should still not emit when tab is hidden
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should add visibility change event listener', () => {
    renderHook(() => useAutoSync());
    
    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useAutoSync());
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
  });

  it('should clear interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    
    const { unmount } = renderHook(() => useAutoSync());
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('should sync when tab becomes visible', () => {
    const addEventListenerMock = vi.fn();
    document.addEventListener = addEventListenerMock;
    
    renderHook(() => useAutoSync());
    
    // Get the visibility change handler
    const visibilityHandler = addEventListenerMock.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];
    
    expect(visibilityHandler).toBeDefined();
    
    // Clear previous calls
    mockSocket.emit.mockClear();
    
    // Simulate tab becoming visible
    document.visibilityState = 'visible';
    act(() => {
      visibilityHandler?.();
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('room:sync');
  });

  it('should not sync when tab becomes hidden', () => {
    const addEventListenerMock = vi.fn();
    document.addEventListener = addEventListenerMock;
    
    renderHook(() => useAutoSync());
    
    // Get the visibility change handler
    const visibilityHandler = addEventListenerMock.mock.calls.find(
      call => call[0] === 'visibilitychange'
    )?.[1];
    
    expect(visibilityHandler).toBeDefined();
    
    // Clear previous calls
    mockSocket.emit.mockClear();
    
    // Simulate tab becoming hidden
    document.visibilityState = 'hidden';
    act(() => {
      visibilityHandler?.();
    });
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it('should restart timer when enabled prop changes', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useAutoSync(enabled, 1000),
      { initialProps: { enabled: true } }
    );
    
    // Initial sync
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    
    // Disable and re-enable
    rerender({ enabled: false });
    mockSocket.emit.mockClear();
    
    rerender({ enabled: true });
    
    // Should emit sync again when re-enabled
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
  });

  it('should restart timer when interval changes', () => {
    const { rerender } = renderHook(
      ({ interval }) => useAutoSync(true, interval),
      { initialProps: { interval: 1000 } }
    );
    
    // Initial sync
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
    mockSocket.emit.mockClear();
    
    // Change interval
    rerender({ interval: 2000 });
    
    // Should emit sync with new hook setup
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);
  });

  it('should handle no socket gracefully', () => {
    // Set socket to null in existing mock
    mockWebSocketContext.socket = null;
    
    // Should not throw when socket is null
    expect(() => {
      renderHook(() => useAutoSync());
    }).not.toThrow();
  });

  it('should return null', () => {
    const { result } = renderHook(() => useAutoSync());
    
    expect(result.current).toBeNull();
  });
});
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '@/contexts/WebSocketContext';
import { getWebSocketInstance } from '@/socket';

// Mock the socket module
vi.mock('@/socket', () => {
  const mockInstance = {
    configure: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
    getConnectionState: vi.fn().mockReturnValue(null)
  };

  return {
    getWebSocketInstance: vi.fn().mockReturnValue(mockInstance)
  };
});

// Test component that uses the WebSocket context
const TestComponent = () => {
  const { isConnected, connect, disconnect, sendMessage } = useWebSocket();
  
  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <button 
        data-testid="connect-btn" 
        onClick={() => connect()}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-btn" 
        onClick={disconnect}
      >
        Disconnect
      </button>
      <button 
        data-testid="send-btn" 
        onClick={() => sendMessage({ type: 'test' })}
      >
        Send Message
      </button>
    </div>
  );
};

describe('WebSocketContext', () => {
  let mockSocketInstance: any;

  beforeEach(() => {
    mockSocketInstance = getWebSocketInstance();
    vi.clearAllMocks();
    
    // Setup default environment variable
    vi.stubEnv('VITE_WEBSOCKET_URL', 'ws://localhost:8080');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should provide WebSocket context to children', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    expect(screen.getByTestId('connect-btn')).toBeInTheDocument();
    expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
    expect(screen.getByTestId('send-btn')).toBeInTheDocument();
  });

  it('should configure WebSocket with environment variable on mount', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(mockSocketInstance.configure).toHaveBeenCalledWith({
      url: 'ws://localhost:8080'
    });
  });

  it('should use default URL when environment variable is not set', () => {
    vi.stubEnv('VITE_WEBSOCKET_URL', '');
    
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(mockSocketInstance.configure).toHaveBeenCalledWith({
      url: 'ws://localhost:8080'
    });
  });

  it('should set up event listeners on mount', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(mockSocketInstance.on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mockSocketInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    unmount();

    expect(mockSocketInstance.off).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(mockSocketInstance.off).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(mockSocketInstance.off).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle connect function', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const connectBtn = screen.getByTestId('connect-btn');
    
    await act(async () => {
      connectBtn.click();
    });

    expect(mockSocketInstance.connect).toHaveBeenCalled();
  });

  it('should handle connect with custom URL', async () => {
    const TestComponentWithCustomURL = () => {
      const { connect } = useWebSocket();
      
      return (
        <button 
          data-testid="connect-custom-btn" 
          onClick={() => connect('ws://custom.com')}
        >
          Connect Custom
        </button>
      );
    };

    render(
      <WebSocketProvider>
        <TestComponentWithCustomURL />
      </WebSocketProvider>
    );

    const connectBtn = screen.getByTestId('connect-custom-btn');
    
    await act(async () => {
      connectBtn.click();
    });

    expect(mockSocketInstance.configure).toHaveBeenCalledWith({
      url: 'ws://custom.com'
    });
    expect(mockSocketInstance.connect).toHaveBeenCalled();
  });

  it('should handle disconnect function', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const disconnectBtn = screen.getByTestId('disconnect-btn');
    
    act(() => {
      disconnectBtn.click();
    });

    expect(mockSocketInstance.disconnect).toHaveBeenCalled();
  });

  it('should handle sendMessage function', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const sendBtn = screen.getByTestId('send-btn');
    
    act(() => {
      sendBtn.click();
    });

    expect(mockSocketInstance.send).toHaveBeenCalledWith({ type: 'test' });
  });

  it('should handle sendMessage error gracefully', () => {
    mockSocketInstance.send.mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const sendBtn = screen.getByTestId('send-btn');
    
    act(() => {
      sendBtn.click();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Cannot send message:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should update connection status when connected event is emitted', () => {
    let connectedHandler: Function;
    
    mockSocketInstance.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'connected') {
        connectedHandler = handler;
      }
    });

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

    act(() => {
      connectedHandler();
    });

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
  });

  it('should update connection status when disconnected event is emitted', () => {
    let connectedHandler: Function;
    let disconnectedHandler: Function;
    
    mockSocketInstance.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'connected') {
        connectedHandler = handler;
      } else if (event === 'disconnected') {
        disconnectedHandler = handler;
      }
    });

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // First connect
    act(() => {
      connectedHandler();
    });
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

    // Then disconnect
    act(() => {
      disconnectedHandler();
    });
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });

  it('should log error when error event is emitted', () => {
    let errorHandler: Function;
    
    mockSocketInstance.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'error') {
        errorHandler = handler;
      }
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const testError = new Error('Test error');

    act(() => {
      errorHandler(testError);
    });

    expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', testError);
    
    consoleSpy.mockRestore();
  });

  it('should throw error when useWebSocket is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      useWebSocket();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('useWebSocket must be used within a WebSocketProvider');

    consoleSpy.mockRestore();
  });

  it('should handle connect error gracefully', async () => {
    mockSocketInstance.connect.mockRejectedValue(new Error('Connection failed'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const connectBtn = screen.getByTestId('connect-btn');
    
    await act(async () => {
      connectBtn.click();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to connect to WebSocket:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});
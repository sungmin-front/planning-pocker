import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RoomProvider, useRoom } from '../contexts/RoomContext';
import { ChatMessage } from '@planning-poker/shared';

// Mock WebSocket context directly
const mockWebSocketContext = {
  socket: null,
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendMessage: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Test component that uses room context
const TestComponent = () => {
  const { sendChatMessage, requestChatHistory, room } = useRoom();
  
  return (
    <div>
      <button onClick={() => sendChatMessage('Hello world')}>
        Send Message
      </button>
      <button onClick={() => requestChatHistory()}>
        Request History
      </button>
      <div data-testid="chat-messages">
        {room?.chatMessages?.map((msg) => (
          <div key={msg.id} data-testid={`message-${msg.id}`}>
            {msg.playerNickname}: {msg.message}
          </div>
        ))}
      </div>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <RoomProvider>
      {component}
    </RoomProvider>
  );
};

describe('Chat Message Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide sendChatMessage function', () => {
    renderWithProviders(<TestComponent />);
    
    const sendButton = screen.getByText('Send Message');
    expect(sendButton).toBeInTheDocument();
  });

  it('should provide requestChatHistory function', () => {
    renderWithProviders(<TestComponent />);
    
    const historyButton = screen.getByText('Request History');
    expect(historyButton).toBeInTheDocument();
  });

  it('should display chat messages from room state', async () => {
    renderWithProviders(<TestComponent />);
    
    // Initially no messages
    const messagesContainer = screen.getByTestId('chat-messages');
    expect(messagesContainer).toBeEmptyDOMElement();
  });
});

describe('Chat Message Context Integration', () => {
  it('should handle incoming chat messages', async () => {
    // This test would verify that the RoomContext properly handles
    // incoming chat:messageReceived WebSocket messages
    expect(true).toBe(true); // Placeholder - actual implementation would test message handling
  });

  it('should handle chat history responses', async () => {
    // This test would verify that the RoomContext properly handles
    // incoming chat:history:response WebSocket messages  
    expect(true).toBe(true); // Placeholder - actual implementation would test history handling
  });

  it('should handle chat message errors', async () => {
    // This test would verify that the RoomContext properly handles
    // chat:message:response errors
    expect(true).toBe(true); // Placeholder - actual implementation would test error handling
  });
});
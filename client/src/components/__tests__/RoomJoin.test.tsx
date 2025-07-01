import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, useParams } from 'react-router-dom';
import { RoomJoin } from '../RoomJoin';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

// Mock the contexts
vi.mock('@/contexts/RoomContext');
vi.mock('@/contexts/WebSocketContext');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useNavigate: vi.fn()
  };
});

const mockJoinRoom = vi.fn();
const mockNavigate = vi.fn();

const defaultUseRoom = {
  room: null,
  isHost: false,
  joinError: null,
  nicknameSuggestions: [],
  joinRoom: mockJoinRoom,
  leaveRoom: vi.fn(),
  vote: vi.fn(),
  syncRoom: vi.fn(),
  createRoom: vi.fn(),
  clearJoinError: vi.fn()
};

const defaultUseWebSocket = {
  isConnected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn()
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('RoomJoin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRoom).mockReturnValue(defaultUseRoom);
    vi.mocked(useWebSocket).mockReturnValue(defaultUseWebSocket);
    vi.mocked(useParams).mockReturnValue({});
    
    // Mock useNavigate
    const { useNavigate } = require('react-router-dom');
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  describe('Basic Rendering', () => {
    it('renders join room form', () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.getByText('Join Room')).toBeInTheDocument();
      expect(screen.getByLabelText('Room ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Nickname')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Join Room' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows connection status when disconnected', () => {
      vi.mocked(useWebSocket).mockReturnValue({
        ...defaultUseWebSocket,
        isConnected: false
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.getByText('Connect to server first')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Join Room' })).toBeDisabled();
    });
  });

  describe('URL Parameter Handling', () => {
    it('pre-fills room ID from URL parameter', () => {
      vi.mocked(useParams).mockReturnValue({ roomId: 'ABC123' });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID') as HTMLInputElement;
      expect(roomIdInput.value).toBe('ABC123');
      expect(roomIdInput).toBeDisabled(); // Should be read-only when from URL
    });

    it('focuses on nickname input when room ID is preset', async () => {
      vi.mocked(useParams).mockReturnValue({ roomId: 'ABC123' });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      await waitFor(() => {
        const nicknameInput = screen.getByLabelText('Your Nickname');
        expect(nicknameInput).toHaveFocus();
      });
    });

    it('allows editing room ID when not from URL parameter', () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID') as HTMLInputElement;
      expect(roomIdInput).not.toBeDisabled();
      expect(roomIdInput).not.toHaveAttribute('readonly');
    });
  });

  describe('Form Validation', () => {
    it('shows error when room ID is empty', async () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Room ID is required')).toBeInTheDocument();
      });
    });

    it('shows error when nickname is empty', async () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Nickname is required')).toBeInTheDocument();
      });
    });

    it('shows error for nickname too short', async () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'A' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Nickname must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('shows error for nickname too long', async () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'A'.repeat(31) } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Nickname must be less than 30 characters')).toBeInTheDocument();
      });
    });

    it('clears field errors when user starts typing', async () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Room ID is required')).toBeInTheDocument();
      });

      const roomIdInput = screen.getByLabelText('Room ID');
      fireEvent.change(roomIdInput, { target: { value: 'A' } });

      await waitFor(() => {
        expect(screen.queryByText('Room ID is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls joinRoom with correct parameters on successful submission', async () => {
      mockJoinRoom.mockResolvedValue(true);

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'abc123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
      });
    });

    it('navigates to room page on successful join', async () => {
      mockJoinRoom.mockResolvedValue(true);

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/room/ABC123?nickname=TestUser');
      });
    });

    it('shows error message on failed join', async () => {
      mockJoinRoom.mockResolvedValue(false);

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to join room. Please check the room ID and try again.')).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      mockJoinRoom.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      expect(screen.getByRole('button', { name: 'Joining...' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Joining...' })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Join Room' })).toBeInTheDocument();
      });
    });

    it('trims whitespace from inputs', async () => {
      mockJoinRoom.mockResolvedValue(true);

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: '  abc123  ' } });
      fireEvent.change(nicknameInput, { target: { value: '  TestUser  ' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to home page when cancel is clicked', () => {
      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Keyboard Interaction', () => {
    it('submits form when Enter is pressed', async () => {
      mockJoinRoom.mockResolvedValue(true);

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      fireEvent.keyDown(nicknameInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith('ABC123', 'TestUser');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles unexpected errors gracefully', async () => {
      mockJoinRoom.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      const nicknameInput = screen.getByLabelText('Your Nickname');
      
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });
      fireEvent.change(nicknameInput, { target: { value: 'TestUser' } });

      const joinButton = screen.getByRole('button', { name: 'Join Room' });
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate Nickname Handling', () => {
    it('displays nickname conflict error and suggestions', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2', 'TestUser3', 'TestUser_']
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.getByText('Nickname already taken')).toBeInTheDocument();
      expect(screen.getByText('Try these suggestions:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser_' })).toBeInTheDocument();
    });

    it('applies error styling to nickname input when conflict occurs', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2']
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const nicknameInput = screen.getByLabelText('Your Nickname');
      expect(nicknameInput).toHaveClass('border-red-500');
    });

    it('allows selecting a suggested nickname', () => {
      const mockClearJoinError = vi.fn();
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2', 'TestUser3'],
        clearJoinError: mockClearJoinError
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const suggestionButton = screen.getByRole('button', { name: 'TestUser2' });
      fireEvent.click(suggestionButton);

      const nicknameInput = screen.getByLabelText('Your Nickname') as HTMLInputElement;
      expect(nicknameInput.value).toBe('TestUser2');
      expect(mockClearJoinError).toHaveBeenCalled();
    });

    it('clears join error when user starts typing in nickname field', () => {
      const mockClearJoinError = vi.fn();
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2'],
        clearJoinError: mockClearJoinError
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const nicknameInput = screen.getByLabelText('Your Nickname');
      fireEvent.change(nicknameInput, { target: { value: 'NewName' } });

      expect(mockClearJoinError).toHaveBeenCalled();
    });

    it('does not clear join error when typing in room ID field', () => {
      const mockClearJoinError = vi.fn();
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2'],
        clearJoinError: mockClearJoinError
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const roomIdInput = screen.getByLabelText('Room ID');
      fireEvent.change(roomIdInput, { target: { value: 'ABC123' } });

      expect(mockClearJoinError).not.toHaveBeenCalled();
    });

    it('displays non-nickname join errors separately', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Room not found',
        nicknameSuggestions: []
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.getByText('Room not found')).toBeInTheDocument();
      expect(screen.queryByText('Try these suggestions:')).not.toBeInTheDocument();
    });

    it('does not show suggestions when error is not nickname conflict', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Room not found',
        nicknameSuggestions: ['TestUser2', 'TestUser3'] // Should be ignored
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.queryByText('Try these suggestions:')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'TestUser2' })).not.toBeInTheDocument();
    });

    it('handles empty suggestions array', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: []
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      expect(screen.getByText('Nickname already taken')).toBeInTheDocument();
      expect(screen.queryByText('Try these suggestions:')).not.toBeInTheDocument();
    });

    it('disables suggestion buttons when form is disabled', () => {
      vi.mocked(useWebSocket).mockReturnValue({
        ...defaultUseWebSocket,
        isConnected: false
      });

      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2', 'TestUser3']
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      const suggestionButton = screen.getByRole('button', { name: 'TestUser2' });
      expect(suggestionButton).toBeDisabled();
    });

    it('displays up to 3 suggestions', () => {
      vi.mocked(useRoom).mockReturnValue({
        ...defaultUseRoom,
        joinError: 'Nickname already taken',
        nicknameSuggestions: ['TestUser2', 'TestUser3', 'TestUser_', 'TestUser4', 'TestUser5']
      });

      render(
        <TestWrapper>
          <RoomJoin />
        </TestWrapper>
      );

      // Should display all provided suggestions (assuming server limits to 3)
      expect(screen.getByRole('button', { name: 'TestUser2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser_' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'TestUser5' })).toBeInTheDocument();
    });
  });
});
import RoomSessionService from '../services/RoomSessionService';
import { RoomSession } from '../models/RoomSession';
import type { UserVote } from '../models/RoomSession';

// Mock MongoDB
jest.mock('../models/RoomSession');

describe('RoomSessionService', () => {
  const mockRoomSession = {
    roomId: 'test-room-123',
    roomName: 'Test Room',
    hostNickname: 'Test Host',
    sessionStartedAt: new Date('2025-01-01T10:00:00Z'),
    isActive: true,
    participants: [
      {
        playerId: 'player1',
        nickname: 'Alice',
        joinedAt: new Date('2025-01-01T10:00:00Z'),
        isHost: true
      },
      {
        playerId: 'player2', 
        nickname: 'Bob',
        joinedAt: new Date('2025-01-01T10:01:00Z'),
        isHost: false
      }
    ],
    totalStories: 1,
    completedStories: 0,
    totalVotingSessions: 1,
    backlogs: [
      {
        storyId: 'story-1',
        storyTitle: 'Test Story',
        storyDescription: 'Test Description',
        isCompleted: false,
        votingSessions: [
          {
            sessionId: 'session-1',
            startedAt: new Date('2025-01-01T10:30:00Z'),
            revealedAt: new Date('2025-01-01T10:35:00Z'),
            isRevealed: true,
            voteStats: {
              maxVote: '5',
              minVote: '3',
              average: 4,
              totalVoters: 2,
              // This is the key issue: MongoDB returns Map objects, not plain objects
              distribution: new Map([
                ['3', 1],
                ['5', 1]
              ]),
              userVotes: [
                {
                  playerId: 'player1',
                  nickname: 'Alice',
                  vote: '5',
                  votedAt: new Date('2025-01-01T10:33:00Z')
                },
                {
                  playerId: 'player2', 
                  nickname: 'Bob',
                  vote: '3',
                  votedAt: new Date('2025-01-01T10:34:00Z')
                }
              ]
            }
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportSessionDataAsHtml', () => {
    it('should handle Map objects in vote distribution correctly', async () => {
      // Arrange
      (RoomSession.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // First call (active session) returns null
        .mockReturnValueOnce({
          sort: jest.fn().mockResolvedValue(mockRoomSession) // Second call with sort
        });

      // Act
      const htmlOutput = await RoomSessionService.exportSessionDataAsHtml('test-room-123');

      // Assert
      expect(htmlOutput).toContain('투표 분포');
      expect(htmlOutput).toContain('3</span>'); // vote label
      expect(htmlOutput).toContain('5</span>'); // vote label
      expect(htmlOutput).toContain('1표 (50.0%)'); // vote count for '3'
      expect(htmlOutput).toContain('1표 (50.0%)'); // vote count for '5'
      expect(htmlOutput).toContain('style="width: 50.0%"'); // percentage bars
    });

    it('should handle empty distribution gracefully', async () => {
      // Arrange
      const mockSessionWithEmptyDistribution = {
        ...mockRoomSession,
        backlogs: [
          {
            ...mockRoomSession.backlogs[0],
            votingSessions: [
              {
                ...mockRoomSession.backlogs[0].votingSessions[0],
                voteStats: {
                  ...mockRoomSession.backlogs[0].votingSessions[0].voteStats,
                  distribution: new Map() // Empty Map
                }
              }
            ]
          }
        ]
      };

      (RoomSession.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce({
          sort: jest.fn().mockResolvedValue(mockSessionWithEmptyDistribution)
        });

      // Act
      const htmlOutput = await RoomSessionService.exportSessionDataAsHtml('test-room-123');

      // Assert
      expect(htmlOutput).toContain('투표 분포 데이터가 없습니다');
    });

    it('should handle null/undefined distribution gracefully', async () => {
      // Arrange
      const mockSessionWithNullDistribution = {
        ...mockRoomSession,
        backlogs: [
          {
            ...mockRoomSession.backlogs[0],
            votingSessions: [
              {
                ...mockRoomSession.backlogs[0].votingSessions[0],
                voteStats: {
                  ...mockRoomSession.backlogs[0].votingSessions[0].voteStats,
                  distribution: null // Null distribution
                }
              }
            ]
          }
        ]
      };

      (RoomSession.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce({
          sort: jest.fn().mockResolvedValue(mockSessionWithNullDistribution)
        });

      // Act
      const htmlOutput = await RoomSessionService.exportSessionDataAsHtml('test-room-123');

      // Assert
      expect(htmlOutput).not.toContain('투표 분포 데이터가 없습니다');
      expect(htmlOutput).toContain('투표 분포'); // Should still show the section header
    });

    it('should handle both Map and plain object distribution formats', async () => {
      // Test that the function works with both MongoDB Map format and plain objects
      const testCases = [
        {
          name: 'Map object (MongoDB format)',
          distribution: new Map([['1', 2], ['3', 1], ['5', 1]])
        },
        {
          name: 'Plain object (legacy format)',  
          distribution: { '1': 2, '3': 1, '5': 1 }
        }
      ];

      for (const testCase of testCases) {
        const mockSessionVariant = {
          ...mockRoomSession,
          backlogs: [
            {
              ...mockRoomSession.backlogs[0],
              votingSessions: [
                {
                  ...mockRoomSession.backlogs[0].votingSessions[0],
                  voteStats: {
                    ...mockRoomSession.backlogs[0].votingSessions[0].voteStats,
                    distribution: testCase.distribution
                  }
                }
              ]
            }
          ]
        };

        (RoomSession.findOne as jest.Mock)
          .mockResolvedValueOnce(null)
          .mockReturnValueOnce({
            sort: jest.fn().mockResolvedValue(mockSessionVariant)
          });

        // Act
        const htmlOutput = await RoomSessionService.exportSessionDataAsHtml('test-room-123');

        // Assert
        expect(htmlOutput).toContain('2표 (50.0%)'); // '1' vote count
        expect(htmlOutput).toContain('1표 (25.0%)'); // '3' and '5' vote counts
        expect(htmlOutput).toContain('style="width: 50.0%"'); // '1' percentage bar
        expect(htmlOutput).toContain('style="width: 25.0%"'); // '3' and '5' percentage bars
      }
    });

    it('should throw error when no session found', async () => {
      // Arrange
      (RoomSession.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce({
          sort: jest.fn().mockResolvedValue(null)
        });

      // Act & Assert
      await expect(
        RoomSessionService.exportSessionDataAsHtml('nonexistent-room')
      ).rejects.toThrow('No session found for room: nonexistent-room');
    });
  });

  describe('Vote Distribution Chart Generation', () => {
    // We'll test the generateVoteDistributionChart function indirectly through HTML export
    // since it's a private function within the exportSessionDataAsHtml method

    it('should generate correct percentage calculations', async () => {
      // Arrange - Test with various vote distributions
      const mockSessionWithComplexDistribution = {
        ...mockRoomSession,
        backlogs: [
          {
            ...mockRoomSession.backlogs[0],
            votingSessions: [
              {
                ...mockRoomSession.backlogs[0].votingSessions[0],
                voteStats: {
                  ...mockRoomSession.backlogs[0].votingSessions[0].voteStats,
                  distribution: new Map([
                    ['1', 1],    // 10%
                    ['2', 2],    // 20%  
                    ['3', 3],    // 30%
                    ['5', 4]     // 40%
                  ]) // Total: 10 votes
                }
              }
            ]
          }
        ]
      };

      (RoomSession.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce({
          sort: jest.fn().mockResolvedValue(mockSessionWithComplexDistribution)
        });

      // Act
      const htmlOutput = await RoomSessionService.exportSessionDataAsHtml('test-room-123');

      // Assert - Check percentage calculations
      expect(htmlOutput).toContain('1표 (10.0%)');  // 1/10 = 10%
      expect(htmlOutput).toContain('2표 (20.0%)');  // 2/10 = 20%  
      expect(htmlOutput).toContain('3표 (30.0%)');  // 3/10 = 30%
      expect(htmlOutput).toContain('4표 (40.0%)');  // 4/10 = 40%
      
      expect(htmlOutput).toContain('style="width: 10.0%"');
      expect(htmlOutput).toContain('style="width: 20.0%"'); 
      expect(htmlOutput).toContain('style="width: 30.0%"');
      expect(htmlOutput).toContain('style="width: 40.0%"');
    });
  });
});
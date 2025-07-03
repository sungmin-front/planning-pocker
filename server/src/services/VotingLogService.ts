import { VotingLog, IVotingLog, VotingEventType, VotingParticipant } from '../models/VotingLog';
import type { Player, ServerRoom, Story } from '../types';

export class VotingLogService {
  private static instance: VotingLogService;

  public static getInstance(): VotingLogService {
    if (!VotingLogService.instance) {
      VotingLogService.instance = new VotingLogService();
    }
    return VotingLogService.instance;
  }

  /**
   * 투표 제출 로그 기록
   */
  public async logVoteCast(
    room: ServerRoom,
    story: Story,
    player: Player,
    vote: string,
    metadata?: { sessionId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<IVotingLog> {
    const participants = this.mapParticipants(room.players, story.votes, false);
    
    const logData = {
      roomId: room.id,
      roomName: room.name,
      storyId: story.id,
      storyTitle: story.title,
      eventType: VotingEventType.VOTE_CAST,
      participants,
      totalParticipants: room.players.length,
      votedCount: Object.keys(story.votes).length,
      triggeredBy: {
        playerId: player.id,
        nickname: player.nickname,
        isHost: player.isHost
      },
      ...metadata
    };

    const votingLog = new VotingLog(logData);
    await votingLog.save();
    
    console.log(`📊 [VotingLog] VOTE_CAST logged - Player: ${player.nickname}, Vote: ${vote}, Story: ${story.title}`);
    return votingLog;
  }

  /**
   * 투표 공개 로그 기록
   */
  public async logVotesRevealed(
    room: ServerRoom,
    story: Story,
    triggeredByPlayer: Player,
    metadata?: { sessionId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<IVotingLog> {
    const participants = this.mapParticipants(room.players, story.votes, true);
    
    const logData = {
      roomId: room.id,
      roomName: room.name,
      storyId: story.id,
      storyTitle: story.title,
      eventType: VotingEventType.VOTES_REVEALED,
      participants,
      totalParticipants: room.players.length,
      votedCount: Object.keys(story.votes).length,
      votes: story.votes,
      triggeredBy: {
        playerId: triggeredByPlayer.id,
        nickname: triggeredByPlayer.nickname,
        isHost: triggeredByPlayer.isHost
      },
      ...metadata
    };

    const votingLog = new VotingLog(logData);
    await votingLog.save();
    
    console.log(`📊 [VotingLog] VOTES_REVEALED logged - Story: ${story.title}, Votes: ${Object.keys(story.votes).length}`);
    return votingLog;
  }

  /**
   * 투표 재시작 로그 기록
   */
  public async logVotingRestarted(
    room: ServerRoom,
    story: Story,
    triggeredByPlayer: Player,
    metadata?: { sessionId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<IVotingLog> {
    const participants = this.mapParticipants(room.players, {}, false);
    
    const logData = {
      roomId: room.id,
      roomName: room.name,
      storyId: story.id,
      storyTitle: story.title,
      eventType: VotingEventType.VOTING_RESTARTED,
      participants,
      totalParticipants: room.players.length,
      votedCount: 0,
      triggeredBy: {
        playerId: triggeredByPlayer.id,
        nickname: triggeredByPlayer.nickname,
        isHost: triggeredByPlayer.isHost
      },
      ...metadata
    };

    const votingLog = new VotingLog(logData);
    await votingLog.save();
    
    console.log(`📊 [VotingLog] VOTING_RESTARTED logged - Story: ${story.title}`);
    return votingLog;
  }

  /**
   * 스토리 완료 로그 기록
   */
  public async logStoryFinalized(
    room: ServerRoom,
    story: Story,
    finalPoint: string,
    triggeredByPlayer: Player,
    metadata?: { sessionId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<IVotingLog> {
    const participants = this.mapParticipants(room.players, story.votes, true);
    
    const logData = {
      roomId: room.id,
      roomName: room.name,
      storyId: story.id,
      storyTitle: story.title,
      eventType: VotingEventType.STORY_FINALIZED,
      participants,
      totalParticipants: room.players.length,
      votedCount: Object.keys(story.votes).length,
      votes: story.votes,
      finalPoint,
      triggeredBy: {
        playerId: triggeredByPlayer.id,
        nickname: triggeredByPlayer.nickname,
        isHost: triggeredByPlayer.isHost
      },
      ...metadata
    };

    const votingLog = new VotingLog(logData);
    await votingLog.save();
    
    console.log(`📊 [VotingLog] STORY_FINALIZED logged - Story: ${story.title}, Final Point: ${finalPoint}`);
    return votingLog;
  }

  /**
   * 스토리 건너뛰기 로그 기록
   */
  public async logStorySkipped(
    room: ServerRoom,
    story: Story,
    triggeredByPlayer: Player,
    metadata?: { sessionId?: string; userAgent?: string; ipAddress?: string }
  ): Promise<IVotingLog> {
    const participants = this.mapParticipants(room.players, story.votes, false);
    
    const logData = {
      roomId: room.id,
      roomName: room.name,
      storyId: story.id,
      storyTitle: story.title,
      eventType: VotingEventType.STORY_SKIPPED,
      participants,
      totalParticipants: room.players.length,
      votedCount: Object.keys(story.votes).length,
      triggeredBy: {
        playerId: triggeredByPlayer.id,
        nickname: triggeredByPlayer.nickname,
        isHost: triggeredByPlayer.isHost
      },
      ...metadata
    };

    const votingLog = new VotingLog(logData);
    await votingLog.save();
    
    console.log(`📊 [VotingLog] STORY_SKIPPED logged - Story: ${story.title}`);
    return votingLog;
  }

  /**
   * 투표 로그 조회 (룸별)
   */
  public async getVotingLogsByRoom(
    roomId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IVotingLog[]> {
    return await VotingLog
      .find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  /**
   * 투표 로그 조회 (스토리별)
   */
  public async getVotingLogsByStory(storyId: string): Promise<IVotingLog[]> {
    return await VotingLog
      .find({ storyId })
      .sort({ timestamp: 1 })
      .exec();
  }

  /**
   * 플레이어를 VotingParticipant로 매핑
   */
  private mapParticipants(
    players: Player[], 
    votes: Record<string, string>, 
    includeVotes: boolean
  ): VotingParticipant[] {
    return players.map(player => ({
      playerId: player.id,
      nickname: player.nickname,
      isHost: player.isHost,
      ...(includeVotes && votes[player.id] && { vote: votes[player.id] })
    }));
  }
}

export default VotingLogService.getInstance();
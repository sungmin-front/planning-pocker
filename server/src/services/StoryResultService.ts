import { StoryResult, IStoryResult } from '../models/StoryResult';

export class StoryResultService {
  private static instance: StoryResultService;

  public static getInstance(): StoryResultService {
    if (!StoryResultService.instance) {
      StoryResultService.instance = new StoryResultService();
    }
    return StoryResultService.instance;
  }

  /**
   * 스토리 완료 결과 저장
   */
  public async saveStoryResult(
    roomId: string,
    roomName: string,
    storyId: string,
    storyTitle: string,
    storyDescription: string | undefined,
    votes: Record<string, string>,
    finalPoint: string,
    completedBy: { playerId: string; nickname: string },
    playerNicknames: Record<string, string> // playerId -> nickname 매핑
  ): Promise<IStoryResult> {
    
    // 투표 통계 계산
    const voteStats = (StoryResult as any).calculateVoteStats(votes);
    
    // 참여자 정보 구성
    const participants = Object.entries(votes).map(([playerId, vote]) => ({
      playerId,
      nickname: playerNicknames[playerId] || 'Unknown',
      vote
    }));
    
    const storyResultData = {
      roomId,
      roomName,
      storyId,
      storyTitle,
      storyDescription,
      votes,
      finalPoint,
      participants,
      totalVoters: participants.length,
      voteStats,
      completedBy
    };

    const storyResult = new StoryResult(storyResultData);
    await storyResult.save();
    
    console.log(`📊 [StoryResult] Story completed - ${storyTitle}: Final Point ${finalPoint}, Votes: ${participants.length}`);
    return storyResult;
  }

  /**
   * 방별 완료된 스토리 결과 조회
   */
  public async getStoryResultsByRoom(
    roomId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IStoryResult[]> {
    return await StoryResult
      .find({ roomId })
      .sort({ completedAt: -1 })
      .limit(limit)
      .skip(offset)
      .exec();
  }

  /**
   * 특정 스토리 결과 조회
   */
  public async getStoryResult(storyId: string): Promise<IStoryResult | null> {
    return await StoryResult.findOne({ storyId }).exec();
  }

  /**
   * 방별 결과를 JSON 형태로 Export
   */
  public async exportRoomResultsAsJson(roomId: string): Promise<any> {
    const results = await this.getStoryResultsByRoom(roomId, 1000, 0);
    
    return {
      roomId,
      exportedAt: new Date().toISOString(),
      totalStories: results.length,
      stories: results.map(result => ({
        storyId: result.storyId,
        storyTitle: result.storyTitle,
        storyDescription: result.storyDescription,
        finalPoint: result.finalPoint,
        completedAt: result.completedAt,
        completedBy: result.completedBy,
        votes: result.participants.map(p => ({
          nickname: p.nickname,
          vote: p.vote
        })),
        statistics: {
          totalVoters: result.totalVoters,
          minVote: result.voteStats.minVote,
          maxVote: result.voteStats.maxVote,
          average: result.voteStats.average,
          mostCommon: result.voteStats.mostCommon,
          distribution: Object.fromEntries(Object.entries(result.voteStats.distribution))
        }
      }))
    };
  }

  /**
   * 방별 결과를 CSV 형태로 Export
   */
  public async exportRoomResultsAsCsv(roomId: string): Promise<string> {
    const results = await this.getStoryResultsByRoom(roomId, 1000, 0);
    
    const headers = [
      'Story ID',
      'Story Title', 
      'Story Description',
      'Final Point',
      'Completed At',
      'Completed By',
      'Total Voters',
      'Min Vote',
      'Max Vote',
      'Average',
      'Most Common',
      'Votes (Player:Vote)'
    ];
    
    const csvRows = [headers.join(',')];
    
    results.forEach(result => {
      const votesStr = result.participants
        .map(p => `${p.nickname}:${p.vote}`)
        .join(';');
      
      const row = [
        result.storyId,
        `"${result.storyTitle}"`,
        `"${result.storyDescription || ''}"`,
        result.finalPoint,
        result.completedAt.toISOString(),
        result.completedBy.nickname,
        result.totalVoters.toString(),
        result.voteStats.minVote,
        result.voteStats.maxVote,
        result.voteStats.average?.toFixed(2) || '',
        result.voteStats.mostCommon.join('/'),
        `"${votesStr}"`
      ];
      
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

export default StoryResultService.getInstance();
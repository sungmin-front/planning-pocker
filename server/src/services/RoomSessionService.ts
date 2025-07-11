import { RoomSession, IRoomSession, UserVote, BacklogStory } from '../models/RoomSession';
import type { Player, ServerRoom, Story } from '../types';

export class RoomSessionService {
  private static instance: RoomSessionService;

  public static getInstance(): RoomSessionService {
    if (!RoomSessionService.instance) {
      RoomSessionService.instance = new RoomSessionService();
    }
    return RoomSessionService.instance;
  }

  /**
   * 새로운 룸 세션 생성 또는 기존 세션 재개
   */
  public async createOrResumeSession(room: ServerRoom): Promise<IRoomSession> {
    let session = await RoomSession.findOne({ roomId: room.id, isActive: true });
    
    if (!session) {
      // 새 세션 생성
      session = new RoomSession({
        roomId: room.id,
        roomName: room.name,
        hostId: room.players.find(p => p.isHost)?.id || '',
        hostNickname: room.players.find(p => p.isHost)?.nickname || 'Unknown Host',
        isActive: true,
        participants: [],
        backlogs: [],
        totalStories: 0,
        completedStories: 0,
        totalVotingSessions: 0
      });

      console.log(`📋 [RoomSession] New session created for room: ${room.name} (${room.id})`);
    }

    // 현재 참여자들 업데이트
    room.players.forEach(player => {
      (session as any).addParticipant(player.id, player.nickname, player.isHost);
    });

    await session.save();
    return session;
  }

  /**
   * 스토리 추가
   */
  public async addStory(roomId: string, story: Story): Promise<void> {
    const session = await this.getActiveSession(roomId);
    
    // 이미 존재하는 스토리인지 확인
    const existingStory = session.backlogs.find(s => s.storyId === story.id);
    if (!existingStory) {
      (session as any).addStory(story.id, story.title, story.description);
      await session.save();
      
      console.log(`📝 [RoomSession] Story added: ${story.title} (${story.id})`);
    }
  }

  /**
   * 투표 세션 시작
   */
  public async startVotingSession(roomId: string, storyId: string): Promise<string> {
    const session = await this.getActiveSession(roomId);
    const sessionId = (session as any).startVotingSession(storyId);
    await session.save();
    
    console.log(`🗳️ [RoomSession] Voting session started: ${sessionId} for story: ${storyId}`);
    return sessionId;
  }

  /**
   * 투표 기록 (개별 투표)
   */
  public async recordVote(roomId: string, storyId: string, player: Player, vote: string): Promise<void> {
    // 투표는 실시간으로 기록하지 않고, 공개 시점에 한 번에 기록
    console.log(`🗳️ [RoomSession] Vote recorded: ${player.nickname} voted ${vote} for story ${storyId}`);
  }

  /**
   * 투표 공개 및 통계 저장
   */
  public async revealVotes(roomId: string, storyId: string, votes: Record<string, string>, players: Player[]): Promise<void> {
    const session = await this.getActiveSession(roomId);
    
    // 현재 활성 투표 세션 찾기
    const story = session.backlogs.find(s => s.storyId === storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    const currentSession = story.votingSessions.find(vs => !vs.isRevealed);
    if (!currentSession) {
      throw new Error('No active voting session found');
    }

    // UserVote 배열 생성
    const userVotes: UserVote[] = Object.entries(votes).map(([playerId, vote]) => {
      const player = players.find(p => p.id === playerId);
      return {
        playerId,
        nickname: player?.nickname || 'Unknown',
        vote,
        votedAt: new Date()
      };
    });

    (session as any).revealVotes(storyId, currentSession.sessionId, userVotes);
    await session.save();
    
    console.log(`📊 [RoomSession] Votes revealed for story: ${storyId}, votes: ${userVotes.length}`);
  }

  /**
   * 스토리 완료 처리
   */
  public async completeStory(roomId: string, storyId: string, finalPoint: string, completedBy: Player): Promise<void> {
    const session = await this.getActiveSession(roomId);
    
    (session as any).completeStory(storyId, finalPoint, {
      playerId: completedBy.id,
      nickname: completedBy.nickname
    });
    
    await session.save();
    
    console.log(`✅ [RoomSession] Story completed: ${storyId} with ${finalPoint} points by ${completedBy.nickname}`);
  }

  /**
   * 투표 재시작
   */
  public async restartVoting(roomId: string, storyId: string): Promise<string> {
    const session = await this.getActiveSession(roomId);
    const newSessionId = (session as any).startVotingSession(storyId);
    await session.save();
    
    console.log(`🔄 [RoomSession] Voting restarted for story: ${storyId}, new session: ${newSessionId}`);
    return newSessionId;
  }

  /**
   * 룸 세션 종료
   */
  public async endSession(roomId: string): Promise<void> {
    const session = await this.getActiveSession(roomId);
    session.isActive = false;
    session.sessionEndedAt = new Date();
    await session.save();
    
    console.log(`🏁 [RoomSession] Session ended for room: ${roomId}`);
  }

  /**
   * 룸 세션 조회
   */
  public async getSession(roomId: string): Promise<IRoomSession | null> {
    return await RoomSession.findOne({ roomId, isActive: true });
  }

  /**
   * 룸의 모든 세션 히스토리 조회
   */
  public async getSessionHistory(roomId: string): Promise<IRoomSession[]> {
    return await RoomSession.find({ roomId }).sort({ sessionStartedAt: -1 });
  }

  /**
   * 룸 세션 통계 조회
   */
  public async getSessionStats(roomId: string): Promise<{
    totalSessions: number;
    totalStories: number;
    completedStories: number;
    totalVotingSessions: number;
    avgStoriesPerSession: number;
    avgVotingSessionsPerStory: number;
  }> {
    const sessions = await this.getSessionHistory(roomId);
    
    const totalSessions = sessions.length;
    const totalStories = sessions.reduce((sum, s) => sum + s.totalStories, 0);
    const completedStories = sessions.reduce((sum, s) => sum + s.completedStories, 0);
    const totalVotingSessions = sessions.reduce((sum, s) => sum + s.totalVotingSessions, 0);
    
    return {
      totalSessions,
      totalStories,
      completedStories,
      totalVotingSessions,
      avgStoriesPerSession: totalSessions > 0 ? totalStories / totalSessions : 0,
      avgVotingSessionsPerStory: totalStories > 0 ? totalVotingSessions / totalStories : 0
    };
  }

  /**
   * 활성 세션 조회 (헬퍼 메서드)
   */
  private async getActiveSession(roomId: string): Promise<IRoomSession> {
    const session = await RoomSession.findOne({ roomId, isActive: true });
    if (!session) {
      throw new Error(`No active session found for room: ${roomId}`);
    }
    return session;
  }

  /**
   * 테스트용 다양한 투표 분포 데이터 생성 (현재 진행중인 투표에 추가)
   */
  public async createTestVoteDistribution(roomId: string): Promise<void> {
    const session = await this.getActiveSession(roomId);
    
    // 현재 진행중인 투표 세션 찾기
    let currentStory = null;
    let currentVotingSession = null;
    
    for (const story of session.backlogs) {
      const activeSession = story.votingSessions.find(vs => !vs.isRevealed);
      if (activeSession) {
        currentStory = story;
        currentVotingSession = activeSession;
        break;
      }
    }

    if (!currentStory || !currentVotingSession) {
      throw new Error('No active voting session found');
    }

    // 가짜 참여자들 추가
    const testParticipants = [
      { playerId: 'test-alice', nickname: 'Alice', isHost: false },
      { playerId: 'test-bob', nickname: 'Bob', isHost: false },
      { playerId: 'test-charlie', nickname: 'Charlie', isHost: false },
      { playerId: 'test-diana', nickname: 'Diana', isHost: false },
      { playerId: 'test-eve', nickname: 'Eve', isHost: false }
    ];

    // 참여자들을 세션에 추가
    testParticipants.forEach(participant => {
      (session as any).addParticipant(participant.playerId, participant.nickname, participant.isHost);
    });

    // 기존 투표를 포함하여 다양한 투표 생성 (분산된 투표)
    const existingVotes = currentVotingSession.voteStats?.userVotes || [];
    const testVotes: UserVote[] = [
      ...existingVotes,
      { playerId: 'test-alice', nickname: 'Alice', vote: '1', votedAt: new Date() },
      { playerId: 'test-bob', nickname: 'Bob', vote: '2', votedAt: new Date() },
      { playerId: 'test-charlie', nickname: 'Charlie', vote: '5', votedAt: new Date() },
      { playerId: 'test-diana', nickname: 'Diana', vote: '8', votedAt: new Date() },
      { playerId: 'test-eve', nickname: 'Eve', vote: '13', votedAt: new Date() }
    ];

    // 투표 공개
    (session as any).revealVotes(currentStory.storyId, currentVotingSession.sessionId, testVotes);
    await session.save();
    
    console.log(`🎯 [RoomSession] Test vote distribution created for story: ${currentStory.storyId}`);
  }

  /**
   * 참여자 이탈 처리
   */
  public async removeParticipant(roomId: string, playerId: string): Promise<void> {
    const session = await this.getActiveSession(roomId);
    const participant = session.participants.find(p => p.playerId === playerId);
    if (participant) {
      participant.leftAt = new Date();
      await session.save();
      
      console.log(`👋 [RoomSession] Participant left: ${participant.nickname} (${playerId})`);
    }
  }

  /**
   * 룸 세션 데이터 내보내기 (JSON 형태)
   */
  public async exportSessionData(roomId: string): Promise<any> {
    // Try to get active session first, if not found get the most recent session
    let session = await RoomSession.findOne({ roomId, isActive: true });
    if (!session) {
      session = await RoomSession.findOne({ roomId }).sort({ sessionStartedAt: -1 });
    }
    
    if (!session) {
      throw new Error(`No session found for room: ${roomId}`);
    }
    
    return {
      roomInfo: {
        roomId: session.roomId,
        roomName: session.roomName,
        hostNickname: session.hostNickname,
        sessionStartedAt: session.sessionStartedAt,
        sessionEndedAt: session.sessionEndedAt,
        isActive: session.isActive
      },
      participants: session.participants,
      stats: {
        totalStories: session.totalStories,
        completedStories: session.completedStories,
        totalVotingSessions: session.totalVotingSessions,
        completionRate: session.totalStories > 0 ? (session.completedStories / session.totalStories * 100).toFixed(1) + '%' : '0%'
      },
      backlogs: session.backlogs.map(story => ({
        storyInfo: {
          storyId: story.storyId,
          storyTitle: story.storyTitle,
          storyDescription: story.storyDescription,
          finalPoint: story.finalPoint,
          isCompleted: story.isCompleted,
          completedAt: story.completedAt,
          completedBy: story.completedBy
        },
        votingSessions: story.votingSessions.map(vs => ({
          sessionId: vs.sessionId,
          startedAt: vs.startedAt,
          revealedAt: vs.revealedAt,
          isRevealed: vs.isRevealed,
          voteStats: vs.voteStats ? {
            summary: {
              maxVote: vs.voteStats.maxVote,
              minVote: vs.voteStats.minVote,
              average: vs.voteStats.average,
              totalVoters: vs.voteStats.totalVoters
            },
            distribution: vs.voteStats.distribution,
            userVotes: vs.voteStats.userVotes
          } : null
        }))
      }))
    };
  }

  /**
   * 룸 세션 데이터를 HTML 형태로 내보내기
   */
  public async exportSessionDataAsHtml(roomId: string): Promise<string> {
    // Try to get active session first, if not found get the most recent session
    let session = await RoomSession.findOne({ roomId, isActive: true });
    if (!session) {
      session = await RoomSession.findOne({ roomId }).sort({ sessionStartedAt: -1 });
    }
    
    if (!session) {
      throw new Error(`No session found for room: ${roomId}`);
    }

    const generateStoryLink = (storyId: string, storyTitle: string): string | null => {
      // Try to generate Jira link if story title looks like a Jira ticket
      const jiraTicketPattern = /^[A-Z]+-\d+/;
      if (jiraTicketPattern.test(storyTitle)) {
        const jiraBaseUrl = process.env.JIRA_BASE_URL || 'https://your-company.atlassian.net';
        const ticketKey = storyTitle.match(jiraTicketPattern)?.[0];
        return `${jiraBaseUrl}/browse/${ticketKey}`;
      }
      return null;
    };

    const formatDate = (date: Date): string => {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date));
    };

    const generateVoteDistributionChart = (distribution: Record<string, number> | Map<string, number>): string => {
      if (!distribution) return '';
      
      // Handle both Map (MongoDB format) and plain object (legacy format)
      let entries: [string, number][];
      if (distribution instanceof Map) {
        entries = Array.from(distribution.entries());
      } else if (typeof distribution === 'object') {
        entries = Object.entries(distribution);
      } else {
        return '';
      }
      
      if (entries.length === 0) return '<p class="no-data">투표 분포 데이터가 없습니다.</p>';
      
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      return entries
        .map(([vote, count]) => {
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
          return `
            <div class="vote-bar">
              <span class="vote-label">${vote}</span>
              <div class="bar-container">
                <div class="bar" style="width: ${percentage}%"></div>
                <span class="vote-count">${count}표 (${percentage}%)</span>
              </div>
            </div>
          `;
        })
        .join('');
    };

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planning Poker 세션 리포트 - ${session.roomName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            line-height: 1.7; 
            color: #2c2c2c; 
            background: #ffffff;
            padding: 40px 20px;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
        }
        .header { 
            text-align: center;
            margin-bottom: 60px;
            padding-bottom: 30px;
            border-bottom: 1px solid #e8e8e8;
        }
        .header h1 { 
            font-size: 2.2em; 
            margin-bottom: 12px; 
            font-weight: 400;
            color: #1a1a1a;
        }
        .header p { 
            font-size: 1em; 
            color: #6b6b6b;
            font-weight: 300;
        }
        .section { 
            margin-bottom: 50px; 
        }
        .section h2 { 
            color: #1a1a1a; 
            border-bottom: 1px solid #e8e8e8; 
            padding-bottom: 12px; 
            margin-bottom: 30px;
            font-size: 1.4em;
            font-weight: 400;
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 30px; 
            margin-bottom: 40px;
        }
        .info-card { 
            padding: 0;
        }
        .info-card h3 { 
            color: #6b6b6b; 
            margin-bottom: 8px; 
            font-size: 0.9em;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-card p { 
            font-size: 1.1em; 
            font-weight: 400;
            color: #1a1a1a;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); 
            gap: 30px;
        }
        .stat-item { 
            text-align: center; 
            padding: 0;
        }
        .stat-number { 
            font-size: 2.5em; 
            font-weight: 300; 
            display: block; 
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .stat-label { 
            font-size: 0.85em; 
            color: #6b6b6b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 400;
        }
        .story-card { 
            margin-bottom: 40px;
            border-bottom: 1px solid #e8e8e8;
            padding-bottom: 30px;
        }
        .story-card:last-child { 
            border-bottom: none; 
            padding-bottom: 0;
        }
        .story-title { 
            font-size: 1.3em; 
            color: #1a1a1a; 
            margin-bottom: 12px;
            font-weight: 400;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .story-link { 
            background: #1a1a1a; 
            color: white; 
            padding: 6px 12px; 
            text-decoration: none; 
            font-size: 0.75em;
            font-weight: 400;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }
        .story-link:hover { 
            background: #2c2c2c; 
        }
        .story-description { 
            color: #6b6b6b; 
            margin-bottom: 15px;
            line-height: 1.6;
        }
        .story-meta { 
            display: flex; 
            gap: 15px; 
            flex-wrap: wrap;
        }
        .meta-item { 
            padding: 4px 8px; 
            font-size: 0.8em;
            color: #6b6b6b;
            border: 1px solid #e8e8e8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            font-weight: 400;
        }
        .final-point { 
            background: #1a1a1a; 
            color: white; 
            border: 1px solid #1a1a1a;
        }
        .voting-sessions-accordion {
            margin-top: 20px;
        }
        .accordion-header {
            background: #f8f8f8;
            padding: 12px 16px;
            border: 1px solid #e8e8e8;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9em;
            color: #1a1a1a;
            transition: background-color 0.2s ease;
        }
        .accordion-header:hover {
            background: #f0f0f0;
        }
        .accordion-header.active {
            background: #f0f0f0;
            border-bottom: none;
        }
        .accordion-indicator {
            font-size: 0.8em;
            transition: transform 0.2s ease;
        }
        .accordion-header.active .accordion-indicator {
            transform: rotate(180deg);
        }
        .accordion-content {
            display: none;
            border: 1px solid #e8e8e8;
            border-top: none;
            background: white;
        }
        .accordion-content.active {
            display: block;
        }
        .voting-session { 
            padding: 20px;
            border-bottom: 1px solid #f5f5f5;
        }
        .voting-session:last-child { 
            border-bottom: none;
        }
        .voting-header { 
            margin-bottom: 20px;
        }
        .voting-header h4 { 
            font-size: 1em; 
            font-weight: 400;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .session-id { 
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; 
            color: #6b6b6b; 
            font-size: 0.75em;
            background: #f8f8f8;
            padding: 4px 8px;
        }
        .vote-stats { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 25px;
        }
        .stats-summary { 
            padding: 0;
        }
        .stats-summary h4 { 
            margin-bottom: 15px; 
            color: #1a1a1a;
            font-size: 0.9em;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px;
            padding: 8px 0;
            border-bottom: 1px solid #f5f5f5;
        }
        .stat-row:last-child {
            border-bottom: none;
        }
        .stat-row span:first-child {
            color: #6b6b6b;
            font-size: 0.9em;
        }
        .stat-row strong {
            color: #1a1a1a;
            font-weight: 400;
        }
        .vote-distribution h4 { 
            margin-bottom: 20px; 
            color: #1a1a1a;
            font-size: 0.9em;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .vote-bar { 
            display: flex; 
            align-items: center; 
            margin-bottom: 12px;
        }
        .vote-label { 
            width: 40px; 
            font-weight: 400; 
            text-align: center;
            color: #1a1a1a;
        }
        .bar-container { 
            flex: 1; 
            margin-left: 15px; 
            position: relative; 
            background: #f5f5f5; 
            height: 24px;
        }
        .bar { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            height: 100%; 
            min-width: 2px;
            border-radius: 2px;
        }
        .vote-count { 
            position: absolute; 
            right: 8px; 
            top: 50%; 
            transform: translateY(-50%); 
            font-size: 0.75em; 
            color: #6b6b6b;
            font-weight: 400;
        }
        .user-votes { 
            margin-top: 25px;
        }
        .user-votes h4 { 
            margin-bottom: 15px; 
            color: #1a1a1a;
            font-size: 0.9em;
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .user-vote { 
            display: flex; 
            justify-content: space-between; 
            padding: 12px 0; 
            border-bottom: 1px solid #f5f5f5;
        }
        .user-vote:last-child {
            border-bottom: none;
        }
        .user-vote span:first-child {
            color: #1a1a1a;
            font-weight: 400;
        }
        .user-vote span:last-child {
            color: #6b6b6b;
            font-size: 0.9em;
        }
        .participants-list { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
            gap: 25px;
        }
        .participant { 
            padding: 0;
        }
        .participant.host .participant-name:after { 
            content: " ●";
            color: #1a1a1a;
            margin-left: 8px;
        }
        .participant-name { 
            font-weight: 400; 
            margin-bottom: 8px;
            color: #1a1a1a;
        }
        .participant-meta { 
            font-size: 0.85em; 
            color: #6b6b6b;
            line-height: 1.5;
        }
        .no-data { 
            text-align: center; 
            color: #6b6b6b; 
            font-style: italic; 
            padding: 60px 20px;
            font-size: 0.9em;
        }
        @media print {
            body { padding: 20px; }
            .story-card { break-inside: avoid; }
        }
        @media (max-width: 768px) {
            body { padding: 20px 15px; }
            .container { max-width: 100%; }
            .info-grid { grid-template-columns: 1fr; gap: 20px; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .participants-list { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Planning Poker 세션 리포트</h1>
            <p>${session.roomName} • ${formatDate(session.sessionStartedAt)}</p>
        </div>
        
        <div class="content">
            <!-- 기본 정보 -->
            <div class="section">
                <h2>세션 정보</h2>
                <div class="info-grid">
                    <div class="info-card">
                        <h3>방 이름</h3>
                        <p>${session.roomName}</p>
                    </div>
                    <div class="info-card">
                        <h3>호스트</h3>
                        <p>${session.hostNickname}</p>
                    </div>
                    <div class="info-card">
                        <h3>세션 시작</h3>
                        <p>${formatDate(session.sessionStartedAt)}</p>
                    </div>
                    <div class="info-card">
                        <h3>상태</h3>
                        <p>${session.isActive ? '진행중' : '완료됨'}</p>
                    </div>
                </div>
            </div>

            <!-- 통계 -->
            <div class="section">
                <h2>전체 통계</h2>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-number">${session.totalStories}</span>
                        <div class="stat-label">총 스토리</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${session.completedStories}</span>
                        <div class="stat-label">완료된 스토리</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${session.totalVotingSessions}</span>
                        <div class="stat-label">총 투표 세션</div>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${session.totalStories > 0 ? ((session.completedStories / session.totalStories) * 100).toFixed(1) : 0}%</span>
                        <div class="stat-label">완료율</div>
                    </div>
                </div>
            </div>

            <!-- 참여자 정보 -->
            <div class="section">
                <h2>참여자 (${session.participants.length}명)</h2>
                <div class="participants-list">
                    ${session.participants.map(participant => `
                        <div class="participant ${participant.isHost ? 'host' : ''}">
                            <div class="participant-name">
                                ${participant.nickname} ${participant.isHost ? '👑' : ''}
                            </div>
                            <div class="participant-meta">
                                참여: ${formatDate(participant.joinedAt)}<br>
                                ${participant.leftAt ? `이탈: ${formatDate(participant.leftAt)}` : '현재 참여중'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- 스토리별 상세 결과 -->
            <div class="section">
                <h2>스토리별 상세 결과</h2>
                ${session.backlogs.length > 0 ? session.backlogs.map(story => {
                  const storyLink = generateStoryLink(story.storyId, story.storyTitle);
                  return `
                    <div class="story-card">
                        <div class="story-header">
                            <div class="story-title">
                                ${story.storyTitle}
                                ${storyLink ? `<a href="${storyLink}" target="_blank" class="story-link">Jira 보기</a>` : ''}
                            </div>
                            ${story.storyDescription ? `<div class="story-description">${story.storyDescription}</div>` : ''}
                            <div class="story-meta">
                                ${story.finalPoint ? `<span class="meta-item final-point">최종 포인트: ${story.finalPoint}</span>` : ''}
                                <span class="meta-item">${story.isCompleted ? '✅ 완료됨' : '⏳ 진행중'}</span>
                                ${story.completedAt ? `<span class="meta-item">완료일: ${formatDate(story.completedAt)}</span>` : ''}
                                ${story.completedBy ? `<span class="meta-item">완료자: ${story.completedBy.nickname}</span>` : ''}
                            </div>
                        </div>
                        
                        ${story.votingSessions.length > 0 ? `
                            <div class="voting-sessions-accordion">
                                <div class="accordion-header" onclick="toggleAccordion(this)">
                                    <span>투표 세션 (${story.votingSessions.length}개)</span>
                                    <span class="accordion-indicator">▼</span>
                                </div>
                                <div class="accordion-content">
                                    ${story.votingSessions.map((session, index) => `
                                        <div class="voting-session">
                                            <div class="voting-header">
                                                <h4>투표 세션 #${index + 1}</h4>
                                                <span class="session-id">${session.sessionId}</span>
                                            </div>
                                            <p><strong>시작:</strong> ${formatDate(session.startedAt)}</p>
                                            ${session.revealedAt ? `<p><strong>공개:</strong> ${formatDate(session.revealedAt)}</p>` : '<p><em>아직 공개되지 않음</em></p>'}
                                            
                                            ${session.voteStats ? `
                                                <div class="vote-stats">
                                                    <div class="stats-summary">
                                                        <h4>투표 통계</h4>
                                                        <div class="stat-row">
                                                            <span>최고 점수:</span>
                                                            <strong>${session.voteStats.maxVote}</strong>
                                                        </div>
                                                        <div class="stat-row">
                                                            <span>최저 점수:</span>
                                                            <strong>${session.voteStats.minVote}</strong>
                                                        </div>
                                                        <div class="stat-row">
                                                            <span>평균:</span>
                                                            <strong>${session.voteStats.average}</strong>
                                                        </div>
                                                        <div class="stat-row">
                                                            <span>총 투표자:</span>
                                                            <strong>${session.voteStats.totalVoters}명</strong>
                                                        </div>
                                                    </div>
                                                    
                                                    <div class="vote-distribution">
                                                        <h4>투표 분포</h4>
                                                        ${generateVoteDistributionChart(session.voteStats.distribution)}
                                                    </div>
                                                </div>
                                                
                                                <div class="user-votes">
                                                    <h4>개별 투표</h4>
                                                    ${session.voteStats.userVotes.map(vote => `
                                                        <div class="user-vote">
                                                            <span><strong>${vote.nickname}</strong></span>
                                                            <span>${vote.vote}점 • ${formatDate(vote.votedAt)}</span>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : '<p class="no-data">투표 결과가 아직 공개되지 않았습니다.</p>'}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                  `;
                }).join('') : '<div class="no-data">아직 스토리가 없습니다.</div>'}
            </div>
        </div>
    </div>
    
    <script>
        function toggleAccordion(header) {
            const content = header.nextElementSibling;
            const indicator = header.querySelector('.accordion-indicator');
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                header.classList.remove('active');
            } else {
                content.classList.add('active');
                header.classList.add('active');
            }
        }
    </script>
</body>
</html>
    `;

    return html;
  }

  /**
   * 룸 세션 데이터를 CSV 형태로 내보내기
   */
  public async exportSessionDataAsCsv(roomId: string): Promise<string> {
    // Try to get active session first, if not found get the most recent session
    let session = await RoomSession.findOne({ roomId, isActive: true });
    if (!session) {
      session = await RoomSession.findOne({ roomId }).sort({ sessionStartedAt: -1 });
    }
    
    if (!session) {
      throw new Error(`No session found for room: ${roomId}`);
    }

    const csvLines: string[] = [];
    
    // Header row
    csvLines.push([
      'Room ID',
      'Room Name', 
      'Host',
      'Story ID',
      'Story Title',
      'Story Description',
      'Final Point',
      'Is Completed',
      'Completed At',
      'Completed By',
      'Voting Session ID',
      'Started At',
      'Revealed At',
      'Max Vote',
      'Min Vote',
      'Average',
      'Total Voters',
      'Voter Nickname',
      'Vote Value',
      'Voted At'
    ].map(field => `"${field}"`).join(','));

    // Data rows
    session.backlogs.forEach(story => {
      story.votingSessions.forEach(votingSession => {
        if (votingSession.voteStats && votingSession.voteStats.userVotes) {
          // Row for each individual vote
          votingSession.voteStats.userVotes.forEach(userVote => {
            csvLines.push([
              `"${session.roomId}"`,
              `"${session.roomName}"`,
              `"${session.hostNickname}"`,
              `"${story.storyId}"`,
              `"${story.storyTitle}"`,
              `"${story.storyDescription || ''}"`,
              `"${story.finalPoint || ''}"`,
              `"${story.isCompleted}"`,
              `"${story.completedAt || ''}"`,
              `"${story.completedBy?.nickname || ''}"`,
              `"${votingSession.sessionId}"`,
              `"${votingSession.startedAt}"`,
              `"${votingSession.revealedAt || ''}"`,
              `"${votingSession.voteStats?.maxVote || ''}"`,
              `"${votingSession.voteStats?.minVote || ''}"`,
              `"${votingSession.voteStats?.average || ''}"`,
              `"${votingSession.voteStats?.totalVoters || ''}"`,
              `"${userVote.nickname}"`,
              `"${userVote.vote}"`,
              `"${userVote.votedAt}"`
            ].join(','));
          });
        } else {
          // Row for voting session without votes
          csvLines.push([
            `"${session.roomId}"`,
            `"${session.roomName}"`,
            `"${session.hostNickname}"`,
            `"${story.storyId}"`,
            `"${story.storyTitle}"`,
            `"${story.storyDescription || ''}"`,
            `"${story.finalPoint || ''}"`,
            `"${story.isCompleted}"`,
            `"${story.completedAt || ''}"`,
            `"${story.completedBy?.nickname || ''}"`,
            `"${votingSession.sessionId}"`,
            `"${votingSession.startedAt}"`,
            `"${votingSession.revealedAt || ''}"`,
            '', '', '', '', '', '', ''
          ].join(','));
        }
      });
    });

    return csvLines.join('\n');
  }
}

export default RoomSessionService.getInstance();
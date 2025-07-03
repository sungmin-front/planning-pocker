import mongoose, { Document, Schema } from 'mongoose';

// 개별 사용자 투표 정보
export interface UserVote {
  playerId: string;
  nickname: string;
  vote: string;
  votedAt: Date;
}

// 투표 통계 정보
export interface VoteStats {
  maxVote: string;
  minVote: string;
  average?: number; // 숫자 투표만 계산
  totalVoters: number;
  distribution: Record<string, number>; // 투표값별 득표수
  userVotes: UserVote[];
}

// 백로그 스토리 정보
export interface BacklogStory {
  storyId: string;
  storyTitle: string;
  storyDescription?: string;
  finalPoint?: string; // 최종 확정된 스토리 포인트
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: {
    playerId: string;
    nickname: string;
  };
  
  // 투표 세션들 (투표가 여러 번 일어날 수 있음)
  votingSessions: Array<{
    sessionId: string;
    startedAt: Date;
    revealedAt?: Date;
    isRevealed: boolean;
    voteStats?: VoteStats;
  }>;
}

// 룸 세션 인터페이스
export interface IRoomSession extends Document {
  // 룸 기본 정보
  roomId: string;
  roomName: string;
  hostId: string;
  hostNickname: string;
  
  // 세션 정보
  sessionStartedAt: Date;
  sessionEndedAt?: Date;
  isActive: boolean;
  
  // 참여자 정보
  participants: Array<{
    playerId: string;
    nickname: string;
    joinedAt: Date;
    leftAt?: Date;
    isHost: boolean;
  }>;
  
  // 백로그 정보
  backlogs: BacklogStory[];
  
  // 현재 활성 스토리
  currentStoryId?: string;
  
  // 통계 정보
  totalStories: number;
  completedStories: number;
  totalVotingSessions: number;
}

// 사용자 투표 스키마
const UserVoteSchema = new Schema<UserVote>({
  playerId: { type: String, required: true },
  nickname: { type: String, required: true },
  vote: { type: String, required: true },
  votedAt: { type: Date, default: Date.now }
}, { _id: false });

// 투표 통계 스키마
const VoteStatsSchema = new Schema<VoteStats>({
  maxVote: { type: String, required: true },
  minVote: { type: String, required: true },
  average: { type: Number },
  totalVoters: { type: Number, required: true },
  distribution: { type: Map, of: Number, required: true },
  userVotes: [UserVoteSchema]
}, { _id: false });

// 백로그 스토리 스키마
const BacklogStorySchema = new Schema<BacklogStory>({
  storyId: { type: String, required: true },
  storyTitle: { type: String, required: true },
  storyDescription: { type: String },
  finalPoint: { type: String },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: {
    playerId: { type: String },
    nickname: { type: String }
  },
  
  votingSessions: [{
    sessionId: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    revealedAt: { type: Date },
    isRevealed: { type: Boolean, default: false },
    voteStats: VoteStatsSchema
  }]
}, { _id: false });

// 룸 세션 스키마
const RoomSessionSchema = new Schema<IRoomSession>({
  // 룸 기본 정보
  roomId: { type: String, required: true, unique: true, index: true },
  roomName: { type: String, required: true },
  hostId: { type: String, required: true },
  hostNickname: { type: String, required: true },
  
  // 세션 정보
  sessionStartedAt: { type: Date, default: Date.now, index: true },
  sessionEndedAt: { type: Date },
  isActive: { type: Boolean, default: true, index: true },
  
  // 참여자 정보
  participants: [{
    playerId: { type: String, required: true },
    nickname: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isHost: { type: Boolean, default: false }
  }],
  
  // 백로그 정보
  backlogs: [BacklogStorySchema],
  
  // 현재 활성 스토리
  currentStoryId: { type: String },
  
  // 통계 정보
  totalStories: { type: Number, default: 0 },
  completedStories: { type: Number, default: 0 },
  totalVotingSessions: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'room_sessions'
});

// 인덱스 설정
RoomSessionSchema.index({ roomId: 1, isActive: 1 });
RoomSessionSchema.index({ 'participants.playerId': 1 });
RoomSessionSchema.index({ sessionStartedAt: -1 });
RoomSessionSchema.index({ 'backlogs.storyId': 1 });

// 투표 통계 계산 메서드
RoomSessionSchema.statics.calculateVoteStats = function(userVotes: UserVote[]): VoteStats {
  if (userVotes.length === 0) {
    throw new Error('No votes to calculate stats from');
  }
  
  const votes = userVotes.map(uv => uv.vote);
  
  // 분포 계산
  const distribution: Record<string, number> = {};
  votes.forEach(vote => {
    distribution[vote] = (distribution[vote] || 0) + 1;
  });
  
  // 최소값, 최대값 (숫자 투표만)
  const numericVotes = votes.filter(vote => !isNaN(Number(vote))).map(Number);
  let minVote = '';
  let maxVote = '';
  let average: number | undefined = undefined;
  
  if (numericVotes.length > 0) {
    minVote = Math.min(...numericVotes).toString();
    maxVote = Math.max(...numericVotes).toString();
    average = numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;
  } else {
    // 숫자가 아닌 투표의 경우 문자열 정렬
    const sortedVotes = votes.sort();
    minVote = sortedVotes[0];
    maxVote = sortedVotes[sortedVotes.length - 1];
  }
  
  return {
    maxVote,
    minVote,
    average,
    totalVoters: userVotes.length,
    distribution,
    userVotes
  };
};

// 스토리 추가 메서드
RoomSessionSchema.methods.addStory = function(storyId: string, storyTitle: string, storyDescription?: string) {
  this.backlogs.push({
    storyId,
    storyTitle,
    storyDescription,
    isCompleted: false,
    votingSessions: []
  });
  this.totalStories = this.backlogs.length;
};

// 투표 세션 시작 메서드
RoomSessionSchema.methods.startVotingSession = function(storyId: string): string {
  const story = this.backlogs.find((s: BacklogStory) => s.storyId === storyId);
  if (!story) {
    throw new Error('Story not found');
  }
  
  const sessionId = `${storyId}_${Date.now()}`;
  story.votingSessions.push({
    sessionId,
    startedAt: new Date(),
    isRevealed: false
  });
  
  this.totalVotingSessions++;
  this.currentStoryId = storyId;
  
  return sessionId;
};

// 투표 공개 메서드
RoomSessionSchema.methods.revealVotes = function(storyId: string, sessionId: string, userVotes: UserVote[]) {
  const story = this.backlogs.find((s: BacklogStory) => s.storyId === storyId);
  if (!story) {
    throw new Error('Story not found');
  }
  
  const session = story.votingSessions.find((vs: any) => vs.sessionId === sessionId);
  if (!session) {
    throw new Error('Voting session not found');
  }
  
  session.isRevealed = true;
  session.revealedAt = new Date();
  session.voteStats = (this.constructor as any).calculateVoteStats(userVotes);
};

// 스토리 완료 메서드
RoomSessionSchema.methods.completeStory = function(storyId: string, finalPoint: string, completedBy: { playerId: string; nickname: string }) {
  const story = this.backlogs.find((s: BacklogStory) => s.storyId === storyId);
  if (!story) {
    throw new Error('Story not found');
  }
  
  story.isCompleted = true;
  story.completedAt = new Date();
  story.finalPoint = finalPoint;
  story.completedBy = completedBy;
  
  this.completedStories = this.backlogs.filter((s: BacklogStory) => s.isCompleted).length;
  this.currentStoryId = undefined;
};

// 참여자 추가 메서드
RoomSessionSchema.methods.addParticipant = function(playerId: string, nickname: string, isHost: boolean = false) {
  const existingParticipant = this.participants.find((p: any) => p.playerId === playerId);
  if (!existingParticipant) {
    this.participants.push({
      playerId,
      nickname,
      joinedAt: new Date(),
      isHost
    });
  }
};

// 모델 생성
export const RoomSession = mongoose.model<IRoomSession>('RoomSession', RoomSessionSchema);

export default RoomSession;
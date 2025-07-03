import mongoose, { Document, Schema } from 'mongoose';

// 투표 이벤트 타입
export enum VotingEventType {
  VOTE_CAST = 'VOTE_CAST',                    // 투표 제출
  VOTE_CHANGED = 'VOTE_CHANGED',              // 투표 변경
  VOTES_REVEALED = 'VOTES_REVEALED',          // 투표 공개
  VOTING_RESTARTED = 'VOTING_RESTARTED',      // 투표 재시작
  STORY_FINALIZED = 'STORY_FINALIZED',        // 스토리 완료
  STORY_SKIPPED = 'STORY_SKIPPED'             // 스토리 건너뛰기
}

// 투표 참여자 정보
export interface VotingParticipant {
  playerId: string;
  nickname: string;
  isHost: boolean;
  vote?: string; // 투표값 (공개 시에만)
}

// 투표 로그 인터페이스
export interface IVotingLog extends Document {
  // 기본 정보
  roomId: string;
  roomName: string;
  storyId: string;
  storyTitle: string;
  
  // 이벤트 정보
  eventType: VotingEventType;
  timestamp: Date;
  
  // 투표 데이터
  participants: VotingParticipant[];
  totalParticipants: number;
  votedCount: number;
  
  // 투표 결과 (공개 시에만)
  votes?: Record<string, string>; // playerId -> vote
  finalPoint?: string;
  
  // 이벤트 발생자
  triggeredBy: {
    playerId: string;
    nickname: string;
    isHost: boolean;
  };
  
  // 투표 통계 (공개 시에만)
  voteStatistics?: {
    unanimous: boolean;
    mostVoted: string[];
    distribution: Record<string, number>;
    averageVote?: number;
  };
  
  // 메타데이터
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

// 투표 로그 스키마
const VotingLogSchema = new Schema<IVotingLog>({
  // 기본 정보
  roomId: { type: String, required: true, index: true },
  roomName: { type: String, required: true },
  storyId: { type: String, required: true, index: true },
  storyTitle: { type: String, required: true },
  
  // 이벤트 정보
  eventType: { 
    type: String, 
    enum: Object.values(VotingEventType), 
    required: true,
    index: true
  },
  timestamp: { type: Date, default: Date.now, index: true },
  
  // 투표 데이터
  participants: [{
    playerId: { type: String, required: true },
    nickname: { type: String, required: true },
    isHost: { type: Boolean, required: true },
    vote: { type: String }
  }],
  totalParticipants: { type: Number, required: true },
  votedCount: { type: Number, required: true },
  
  // 투표 결과
  votes: { type: Map, of: String },
  finalPoint: { type: String },
  
  // 이벤트 발생자
  triggeredBy: {
    playerId: { type: String, required: true },
    nickname: { type: String, required: true },
    isHost: { type: Boolean, required: true }
  },
  
  // 투표 통계
  voteStatistics: {
    unanimous: { type: Boolean },
    mostVoted: [{ type: String }],
    distribution: { type: Map, of: Number },
    averageVote: { type: Number }
  },
  
  // 메타데이터
  sessionId: { type: String },
  userAgent: { type: String },
  ipAddress: { type: String }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  collection: 'voting_logs'
});

// 인덱스 설정
VotingLogSchema.index({ roomId: 1, timestamp: -1 });
VotingLogSchema.index({ storyId: 1, eventType: 1 });
VotingLogSchema.index({ 'triggeredBy.playerId': 1, timestamp: -1 });

// 투표 통계 계산 메서드
VotingLogSchema.methods.calculateVoteStatistics = function() {
  if (!this.votes || Object.keys(this.votes).length === 0) {
    return null;
  }
  
  const voteValues = Object.values(this.votes) as string[];
  const distribution: Record<string, number> = {};
  
  // 투표 분포 계산
  voteValues.forEach((vote) => {
    distribution[vote] = (distribution[vote] || 0) + 1;
  });
  
  // 최다 득표
  const maxCount = Math.max(...Object.values(distribution));
  const mostVoted = Object.keys(distribution).filter(vote => distribution[vote] === maxCount);
  
  // 만장일치 확인
  const unanimous = Object.keys(distribution).length === 1;
  
  // 평균 계산 (숫자 투표만)
  const numericVotes = voteValues.filter(vote => !isNaN(Number(vote))).map(Number);
  const averageVote = numericVotes.length > 0 
    ? numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length 
    : undefined;
  
  return {
    unanimous,
    mostVoted,
    distribution,
    averageVote
  };
};

// 모델 생성
export const VotingLog = mongoose.model<IVotingLog>('VotingLog', VotingLogSchema);

export default VotingLog;
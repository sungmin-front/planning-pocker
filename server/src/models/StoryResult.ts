import mongoose, { Document, Schema } from 'mongoose';

// 스토리 투표 결과 인터페이스
export interface IStoryResult extends Document {
  // 기본 정보
  roomId: string;
  roomName: string;
  storyId: string;
  storyTitle: string;
  storyDescription?: string;
  
  // 투표 결과
  votes: Record<string, string>; // playerId -> vote
  finalPoint: string;
  
  // 투표 통계
  participants: {
    playerId: string;
    nickname: string;
    vote: string;
  }[];
  totalVoters: number;
  
  // 투표 결과 분석
  voteStats: {
    minVote: string;
    maxVote: string;
    average: number; // 숫자 투표만 계산
    mostCommon: string[];
    distribution: Record<string, number>;
  };
  
  // 완료 정보
  completedAt: Date;
  completedBy: {
    playerId: string;
    nickname: string;
  };
}

// 스토리 결과 스키마
const StoryResultSchema = new Schema<IStoryResult>({
  // 기본 정보
  roomId: { type: String, required: true, index: true },
  roomName: { type: String, required: true },
  storyId: { type: String, required: true },
  storyTitle: { type: String, required: true },
  storyDescription: { type: String },
  
  // 투표 결과
  votes: { type: Map, of: String, required: true },
  finalPoint: { type: String, required: true },
  
  // 투표 참여자
  participants: [{
    playerId: { type: String, required: true },
    nickname: { type: String, required: true },
    vote: { type: String, required: true }
  }],
  totalVoters: { type: Number, required: true },
  
  // 투표 결과 분석
  voteStats: {
    minVote: { type: String, required: true },
    maxVote: { type: String, required: true },
    average: { type: Number },
    mostCommon: [{ type: String }],
    distribution: { type: Map, of: Number }
  },
  
  // 완료 정보
  completedAt: { type: Date, default: Date.now, index: true },
  completedBy: {
    playerId: { type: String, required: true },
    nickname: { type: String, required: true }
  }
}, {
  timestamps: true,
  collection: 'story_results'
});

// 인덱스 설정
StoryResultSchema.index({ roomId: 1, completedAt: -1 });
StoryResultSchema.index({ storyId: 1 });

// 투표 통계 계산 정적 메서드
StoryResultSchema.statics.calculateVoteStats = function(votes: Record<string, string>) {
  const voteValues = Object.values(votes);
  
  if (voteValues.length === 0) {
    return null;
  }
  
  // 분포 계산
  const distribution: Record<string, number> = {};
  voteValues.forEach(vote => {
    distribution[vote] = (distribution[vote] || 0) + 1;
  });
  
  // 최소값, 최대값 (숫자 투표만)
  const numericVotes = voteValues.filter(vote => !isNaN(Number(vote))).map(Number);
  let minVote = '';
  let maxVote = '';
  let average: number | undefined = undefined;
  
  if (numericVotes.length > 0) {
    minVote = Math.min(...numericVotes).toString();
    maxVote = Math.max(...numericVotes).toString();
    average = numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;
  } else {
    // 숫자가 아닌 투표의 경우 문자열 정렬
    const sortedVotes = voteValues.sort();
    minVote = sortedVotes[0];
    maxVote = sortedVotes[sortedVotes.length - 1];
  }
  
  // 최다 득표
  const maxCount = Math.max(...Object.values(distribution));
  const mostCommon = Object.keys(distribution).filter(vote => distribution[vote] === maxCount);
  
  return {
    minVote,
    maxVote,
    average,
    mostCommon,
    distribution
  };
};

// 모델 생성
export const StoryResult = mongoose.model<IStoryResult>('StoryResult', StoryResultSchema);

export default StoryResult;
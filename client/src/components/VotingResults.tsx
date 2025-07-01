import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VoteDistribution {
  value: string;
  count: number;
  percentage: number;
}

export const VotingResults: React.FC = () => {
  const { room } = useRoom();

  // Only render if room exists and has a current story that's revealed
  if (!room || !room.currentStoryId) {
    return null;
  }

  const currentStory = room.stories.find(story => story.id === room.currentStoryId);
  
  if (!currentStory || currentStory.status !== 'revealed') {
    return null;
  }

  const votes = currentStory.votes || {};
  const voteValues = Object.values(votes);
  const totalVotes = voteValues.length;

  // Handle empty votes
  if (totalVotes === 0) {
    return (
      <Card data-testid="voting-results" className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Voting Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No votes cast</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate vote distribution
  const distribution = new Map<string, number>();
  voteValues.forEach(vote => {
    distribution.set(vote, (distribution.get(vote) || 0) + 1);
  });

  // Convert to array and sort logically
  const sortedDistribution: VoteDistribution[] = Array.from(distribution.entries())
    .map(([value, count]) => ({
      value,
      count,
      percentage: Math.round((count / totalVotes) * 100)
    }))
    .sort((a, b) => {
      // Sort numbers first, then special characters
      const aIsNum = !isNaN(Number(a.value));
      const bIsNum = !isNaN(Number(b.value));
      
      if (aIsNum && bIsNum) {
        return Number(a.value) - Number(b.value);
      }
      if (aIsNum && !bIsNum) return -1;
      if (!aIsNum && bIsNum) return 1;
      
      // Both are special characters, sort alphabetically
      return a.value.localeCompare(b.value);
    });

  // Find most voted value(s)
  const maxCount = Math.max(...sortedDistribution.map(d => d.count));
  const mostVotedValues = sortedDistribution.filter(d => d.count === maxCount);

  // Determine consensus type
  const getConsensusType = () => {
    const uniqueVotes = sortedDistribution.length;
    if (uniqueVotes === 1) return 'unanimous';
    if (mostVotedValues.length > 1 && maxCount > 1) return 'tied';
    return 'split decision';
  };

  const consensusType = getConsensusType();

  const getConsensusColor = () => {
    switch (consensusType) {
      case 'unanimous': return 'bg-green-100 text-green-800';
      case 'tied': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card data-testid="voting-results" className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Voting Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Consensus Indicator */}
        <div className="flex items-center gap-2">
          <Badge 
            data-testid="consensus-indicator"
            className={getConsensusColor()}
          >
            {consensusType === 'unanimous' && 'Unanimous'}
            {consensusType === 'tied' && 'Tied'}
            {consensusType === 'split decision' && 'Split Decision'}
          </Badge>
          <span data-testid="total-votes" className="text-sm text-muted-foreground">
            {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
        </div>

        {/* Vote Distribution */}
        <div className="space-y-2">
          {sortedDistribution.map((item, index) => (
            <div 
              key={item.value} 
              data-testid={`vote-item-${item.value}`}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                mostVotedValues.length === 1 && item.count === maxCount 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    mostVotedValues.length === 1 && item.count === maxCount
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white border-2'
                  }`}
                  data-testid={mostVotedValues.length === 1 && item.count === maxCount ? 'most-voted' : undefined}
                >
                  {item.value}
                </div>
                <div>
                  <div className="font-medium">
                    {item.count} {item.count === 1 ? 'vote' : 'votes'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.percentage}% of total
                  </div>
                </div>
              </div>
              
              {/* Visual bar */}
              <div className="flex-1 max-w-32 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      mostVotedValues.length === 1 && item.count === maxCount
                        ? 'bg-primary'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Most Voted Summary */}
        {mostVotedValues.length === 1 && (
          <div className="text-center p-3 bg-primary/5 rounded-lg border">
            <p className="text-sm font-medium">
              Most voted: <span className="font-bold text-primary">{mostVotedValues[0].value}</span>
              {' '}({mostVotedValues[0].count} {mostVotedValues[0].count === 1 ? 'vote' : 'votes'})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
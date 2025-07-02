import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // All possible vote options (including those with 0 votes)
  const VOTE_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  
  // Calculate vote distribution
  const distribution = new Map<string, number>();
  voteValues.forEach(vote => {
    distribution.set(vote, (distribution.get(vote) || 0) + 1);
  });

  // Create complete distribution including 0-vote options
  const sortedDistribution: VoteDistribution[] = VOTE_OPTIONS.map(option => ({
    value: option,
    count: distribution.get(option) || 0,
    percentage: Math.round(((distribution.get(option) || 0) / totalVotes) * 100)
  }));

  // Prepare data for line chart
  const chartData = sortedDistribution.map(item => ({
    name: item.value,
    votes: item.count,
    percentage: item.percentage
  }));

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
      <CardContent className="space-y-6">
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

        {/* Line Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: any, name: string) => [
                  `${value} ${value === 1 ? 'vote' : 'votes'}`,
                  'Votes'
                ]}
                labelFormatter={(label) => `Option: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="votes" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vote Distribution - Compact Version */}
        <div className="grid grid-cols-3 gap-2">
          {sortedDistribution.filter(item => item.count > 0).map((item) => (
            <div 
              key={item.value} 
              data-testid={`vote-item-${item.value}`}
              className={`p-2 rounded-lg border text-center ${
                mostVotedValues.length === 1 && item.count === maxCount 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-gray-50'
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-1 ${
                  mostVotedValues.length === 1 && item.count === maxCount
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white border-2'
                }`}
              >
                {item.value}
              </div>
              <div className="text-xs font-medium">{item.count}</div>
              <div className="text-xs text-muted-foreground">{item.percentage}%</div>
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
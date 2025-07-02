import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface VoteDistribution {
  value: string;
  count: number;
  percentage: number;
}

interface VotingStats {
  highest: number;
  lowest: number;
  average: number;
  numericVotesOnly: number[];
}

interface VotingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  votes: Record<string, string>;
  totalVotes: number;
}

export const VotingResultsModal: React.FC<VotingResultsModalProps> = ({
  isOpen,
  onClose,
  votes,
  totalVotes,
}) => {
  if (totalVotes === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Voting Results
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground">
            No votes cast
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // All possible vote options (including those with 0 votes)
  const VOTE_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  
  // Calculate vote distribution
  const voteValues = Object.values(votes);
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

  // Calculate statistics (only for numeric votes)
  const calculateStats = (): VotingStats => {
    const numericVotes = voteValues
      .filter(vote => !isNaN(Number(vote)))
      .map(vote => Number(vote));
    
    if (numericVotes.length === 0) {
      return {
        highest: 0,
        lowest: 0,
        average: 0,
        numericVotesOnly: []
      };
    }

    const highest = Math.max(...numericVotes);
    const lowest = Math.min(...numericVotes);
    const average = numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;

    return {
      highest,
      lowest,
      average: Math.round(average * 10) / 10, // Round to 1 decimal place
      numericVotesOnly: numericVotes
    };
  };

  const stats = calculateStats();

  // Determine consensus type
  const getConsensusType = () => {
    const uniqueVotes = sortedDistribution.filter(d => d.count > 0).length;
    const maxCount = Math.max(...sortedDistribution.map(d => d.count));
    const mostVotedValues = sortedDistribution.filter(d => d.count === maxCount);
    
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Voting Results & Statistics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Consensus Indicator */}
          <div className="flex items-center gap-2">
            <Badge className={getConsensusColor()}>
              {consensusType === 'unanimous' && 'Unanimous'}
              {consensusType === 'tied' && 'Tied'}
              {consensusType === 'split decision' && 'Split Decision'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
            </span>
          </div>

          {/* Statistics Cards */}
          {stats.numericVotesOnly.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Highest</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{stats.highest}</div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Lowest</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{stats.lowest}</div>
              </Card>
              
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Average</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{stats.average}</div>
              </Card>
            </div>
          )}

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
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
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
};
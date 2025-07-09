import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import { Button } from '@/components/ui/shadcn/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/shadcn/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Target, Check } from 'lucide-react';

interface VoteDistribution {
  value: string;
  count: number;
  percentage: number;
}


interface VotingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  votes: Record<string, string>;
  totalVotes: number;
  isHost?: boolean;
  storyId?: string;
  onFinalize?: (storyId: string, finalPoint: string) => void;
}

export const VotingResultsModal: React.FC<VotingResultsModalProps> = ({
  isOpen,
  onClose,
  votes,
  totalVotes,
  isHost = false,
  storyId,
  onFinalize,
}) => {
  const [selectedFinalPoint, setSelectedFinalPoint] = useState<string>('');

  // All possible vote options (including those with 0 votes)
  const VOTE_OPTIONS = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];
  
  // Calculate vote distribution
  const voteValues = Object.values(votes);
  const distribution = new Map<string, number>();
  voteValues.forEach(vote => {
    distribution.set(vote, (distribution.get(vote) || 0) + 1);
  });

  // Create sorted distribution including options with 0 votes
  const sortedDistribution: VoteDistribution[] = VOTE_OPTIONS.map(option => ({
    value: option,
    count: distribution.get(option) || 0,
    percentage: totalVotes > 0 ? ((distribution.get(option) || 0) / totalVotes) * 100 : 0
  }));

  // Chart data for line chart (all values including zero votes)
  const chartData = sortedDistribution.map(d => ({
    name: d.value,
    vote: d.value,
    votes: d.count,
    percentage: d.percentage
  }));

  // Calculate statistics for numeric values only
  const calculateStats = () => {
    const numericVotes = voteValues.filter(vote => !isNaN(Number(vote)));
    const numericNumbers = numericVotes.map(vote => Number(vote));
    
    if (numericNumbers.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        numericVotesOnly: []
      };
    }

    const sum = numericNumbers.reduce((acc, val) => acc + val, 0);
    const average = sum / numericNumbers.length;
    const highest = Math.max(...numericNumbers);
    const lowest = Math.min(...numericNumbers);

    return {
      average: Math.round(average * 10) / 10,
      highest,
      lowest,
      numericVotesOnly: numericNumbers
    };
  };

  const stats = calculateStats();

  // Find closest value to average
  const findClosestToAverage = () => {
    if (stats.numericVotesOnly.length === 0) return '';
    
    const VOTE_OPTIONS = ['1', '2', '3', '5', '8', '13', '21'];
    const numericOptions = VOTE_OPTIONS.map(Number);
    
    let closest = numericOptions[0];
    let minDiff = Math.abs(numericOptions[0] - stats.average);
    
    for (const option of numericOptions) {
      const diff = Math.abs(option - stats.average);
      if (diff < minDiff) {
        minDiff = diff;
        closest = option;
      }
    }
    
    return closest.toString();
  };

  // Set default selected value when modal opens
  useEffect(() => {
    if (isOpen && isHost && stats.numericVotesOnly.length > 0) {
      setSelectedFinalPoint(findClosestToAverage());
    }
  }, [isOpen, isHost, stats.average, stats.numericVotesOnly.length]);

  // Handle finalize
  const handleFinalize = () => {
    if (storyId && onFinalize && selectedFinalPoint) {
      onFinalize(storyId, selectedFinalPoint);
      onClose();
    }
  };

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
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Voting Results & Statistics
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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
            <div className="grid grid-cols-3 gap-2">
              <Card className="p-1.5 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <TrendingUp className="h-2.5 w-2.5 text-green-600" />
                  <span className="text-xs font-medium">Highest</span>
                </div>
                <div className="text-sm font-bold text-green-600 text-center">{stats.highest}</div>
              </Card>
              
              <Card className="p-1.5 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <TrendingDown className="h-2.5 w-2.5 text-red-600" />
                  <span className="text-xs font-medium">Lowest</span>
                </div>
                <div className="text-sm font-bold text-red-600 text-center">{stats.lowest}</div>
              </Card>
              
              <Card className="p-1.5 flex flex-col justify-center">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Target className="h-2.5 w-2.5 text-blue-600" />
                  <span className="text-xs font-medium">Average</span>
                </div>
                <div className="text-sm font-bold text-blue-600 text-center">{stats.average}</div>
              </Card>
            </div>
          )}

          {/* Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Vote Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                      formatter={(value: any) => [
                        `${value} ${value === 1 ? 'vote' : 'votes'}`,
                        'Votes'
                      ]}
                      labelFormatter={(label) => `Option: ${label}`}
                    />
                    <Bar 
                      dataKey="votes" 
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Host Finalize Section */}
          {isHost && storyId && onFinalize && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Finalize Story Points</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Select value={selectedFinalPoint} onValueChange={setSelectedFinalPoint}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select final point" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="13">13</SelectItem>
                        <SelectItem value="21">21</SelectItem>
                        <SelectItem value="?">?</SelectItem>
                        <SelectItem value="☕">☕</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleFinalize}
                    disabled={!selectedFinalPoint}
                    size="sm"
                    className="h-8"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Finalize
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
};
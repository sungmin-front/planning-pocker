import React, { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/shadcn/select';
import { useRoom } from '@/contexts/RoomContext';

// Default Fibonacci sequence vote options
const VOTE_OPTIONS = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const FinalizePoints: React.FC = () => {
  const { room, isHost, setFinalPoint } = useRoom();
  const [selectedPoint, setSelectedPoint] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Only show for host and when votes are revealed and no final point set
  if (!isHost || 
      !room?.currentStoryId ||
      !room?.stories) {
    return null;
  }

  const currentStory = room.stories.find(s => s.id === room.currentStoryId);
  
  if (!currentStory || 
      currentStory.status !== 'revealed' || 
      currentStory.final_point) {
    return null;
  }

  // Calculate vote counts
  const voteCounts: Record<string, number> = {};
  Object.values(currentStory.votes || {}).forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });

  // Sort by count (descending) then by value
  const sortedVotes = Object.entries(voteCounts)
    .sort(([a, countA], [b, countB]) => {
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b);
    });

  const handleFinalize = async () => {
    if (!selectedPoint || !room?.currentStoryId) return;
    
    setIsLoading(true);
    try {
      await setFinalPoint(room.currentStoryId, selectedPoint);
      setSelectedPoint('');
    } catch (error) {
      console.error('Failed to finalize points:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Finalize Story Points</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Votes Display */}
        <div>
          <h4 className="font-medium mb-2">Current Votes:</h4>
          <div className="space-y-1">
            {sortedVotes.map(([vote, count]) => (
              <div key={vote} className="flex justify-between text-sm">
                <span>{vote}</span>
                <span>({count} vote{count !== 1 ? 's' : ''})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Point Selection */}
        <div className="space-y-2">
          <label htmlFor="final-point" className="text-sm font-medium">
            Select Final Point:
          </label>
          <Select value={selectedPoint} onValueChange={setSelectedPoint}>
            <SelectTrigger>
              <SelectValue placeholder="Select final point" />
            </SelectTrigger>
            <SelectContent>
              {VOTE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Finalize Button */}
        <Button 
          onClick={handleFinalize}
          disabled={!selectedPoint || isLoading}
          className="w-full"
        >
          {isLoading ? 'Finalizing...' : 'Finalize Points'}
        </Button>
      </CardContent>
    </Card>
  );
};
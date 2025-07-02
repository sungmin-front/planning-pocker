import React from 'react';
import { useRoom } from '@/contexts/RoomContext';

export const CurrentStory: React.FC = () => {
  const { room } = useRoom();

  // Early return if no room
  if (!room) {
    return null;
  }

  const { currentStoryId, stories } = room;

  if (!currentStoryId) {
    return (
      <div 
        data-testid="current-story-placeholder" 
        className="current-story-placeholder p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg text-gray-500"
      >
        <p>No story selected for voting</p>
      </div>
    );
  }

  const currentStory = stories.find(s => s.id === currentStoryId);
  if (!currentStory) return null;

  const statusMessages = {
    pending: 'Waiting to start',
    voting: 'Voting in progress',
    revealed: 'Votes revealed',
    closed: 'Finalized',
    skipped: 'Skipped'
  };

  const statusMessage = statusMessages[currentStory.status] || currentStory.status;

  return (
    <div data-testid="current-story" className="current-story p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col gap-2">
      <h2 data-testid="current-story-title" className="current-story-title text-l font-semibold text-gray-900">
        {currentStory.title}
      </h2>
      
      {currentStory.description && (
        <div 
          data-testid="current-story-description"
          className="current-story-description mb-4 whitespace-pre-line text-gray-700"
        >
          {currentStory.description}
        </div>
      )}
      
      <div className="current-story-status flex items-center gap-3 text-sm text-gray-600">
        <span 
          data-testid="status-badge"
          className="status-badge px-3 py-1 bg-gray-100 rounded-md font-medium"
        >
          {statusMessage}
        </span>
        
        {currentStory.final_point !== undefined && currentStory.final_point !== null && (
          <span 
            data-testid="final-points"
            className="final-points ml-auto font-semibold text-blue-600"
          >
            Final: {currentStory.final_point} points
          </span>
        )}
      </div>
    </div>
  );
};
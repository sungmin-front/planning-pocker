import React from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

export const StoryList: React.FC = () => {
  const { room, isHost } = useRoom();
  const { socket } = useWebSocket();

  // Early return if no room
  if (!room) {
    return null;
  }

  const { stories, currentStoryId } = room;

  const handleSelectStory = (storyId: string) => {
    if (!isHost || !socket) return; // Only host can select stories
    
    socket.emit('story:select', { storyId });
  };

  if (stories.length === 0) {
    return (
      <div data-testid="story-list-empty" className="story-list-empty p-6 text-center text-gray-500">
        <p>No stories in the backlog yet.</p>
        {isHost && <p>Use the "Add Story" button to create one.</p>}
      </div>
    );
  }

  return (
    <div className="story-list bg-gray-50 rounded-lg p-4 mb-5">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Backlog</h3>
      <ul className="space-y-2">
        {stories.map(story => {
          const isActive = story.id === currentStoryId;
          const statusIcons = {
            pending: '⏳',
            voting: '🗳️',
            revealed: '👁️',
            closed: '✅'
          };
          const statusIcon = statusIcons[story.status] || '❓';
          
          return (
            <li 
              key={story.id}
              data-testid={`story-item-${story.id}`}
              className={`story-item p-3 border rounded-md bg-white transition-all duration-200 ${
                isActive ? 'active border-blue-500 bg-blue-50' : 'border-gray-200'
              } ${
                isHost ? 'clickable cursor-pointer hover:border-gray-300 hover:shadow-sm' : ''
              }`}
              onClick={() => handleSelectStory(story.id)}
            >
              <div className="story-header flex justify-between items-center mb-1">
                <span className="story-title font-medium text-gray-900">{story.title}</span>
                <div className="flex items-center space-x-2">
                  <span className="story-status text-lg" title={story.status}>{statusIcon}</span>
                  {story.final_point !== undefined && story.final_point !== null && (
                    <span className="story-points font-medium text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded">
                      {story.final_point} pts
                    </span>
                  )}
                </div>
              </div>
              {story.description && (
                <p 
                  data-testid={`story-description-${story.id}`}
                  className="story-description text-sm text-gray-600 mt-1"
                >
                  {story.description}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
import React, { useState } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface StoryListProps {
  stories: any[];
}

export const StoryList: React.FC<StoryListProps> = ({ stories }) => {
  const { room, isHost } = useRoom();
  const { send } = useWebSocket();

  // Early return if no room
  if (!room) {
    return null;
  }

  const { currentStoryId } = room;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; storyId: string } | null>(null);

  const handleSelectStory = (storyId: string) => {
    if (!isHost) {
      console.log('Not host, cannot select story');
      return; // Only host can select stories
    }
    
    console.log('Selecting story:', storyId);
    send({
      type: 'STORY_SELECT',
      payload: { storyId }
    });
  };

  const handleCardClick = (story: any, event: React.MouseEvent) => {
    event.preventDefault();
    if (story.jiraMetadata?.jiraUrl) {
      window.open(story.jiraMetadata.jiraUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContextMenu = (event: React.MouseEvent, storyId: string) => {
    if (!isHost) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      storyId
    });
  };

  const handleContextMenuAction = (action: 'select') => {
    if (contextMenu && action === 'select') {
      handleSelectStory(contextMenu.storyId);
    }
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const getIssueTypeColor = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'story': case '스토리': return 'bg-emerald-500 text-white';
      case 'bug': case '버그': return 'bg-red-500 text-white';
      case 'task': case '작업': return 'bg-blue-500 text-white';
      case 'epic': case '에픽': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'highest': case 'high': return 'border-red-300 bg-red-50 text-red-700';
      case 'medium': return 'border-orange-300 bg-orange-50 text-orange-700';
      case 'low': case 'lowest': return 'border-green-300 bg-green-50 text-green-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'highest': return '⬆️';
      case 'high': return '↗️';
      case 'medium': return '➡️';
      case 'low': return '↘️';
      case 'lowest': return '⬇️';
      default: return '➡️';
    }
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
          const statusIcons: Record<string, string> = {
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
              className={`story-item p-4 border rounded-lg bg-white transition-all duration-200 ${
                isActive ? 'active border-blue-500 bg-blue-50' : 'border-gray-200'
              } cursor-pointer hover:border-gray-300 hover:shadow-md`}
              onClick={(e) => handleCardClick(story, e)}
              onContextMenu={(e) => handleContextMenu(e, story.id)}
            >
              <div className="story-header flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="story-title font-medium text-gray-900 truncate">{story.title}</span>
                  </div>
                  
                  {/* Jira metadata badges */}
                  {story.jiraMetadata && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {/* Issue Type - 둥근 solid 배지 */}
                      <span 
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getIssueTypeColor(story.jiraMetadata.issueType)}`}
                      >
                        {story.jiraMetadata.issueType}
                      </span>
                      
                      {/* Priority - 모서리가 각진 outline 배지 */}
                      {story.jiraMetadata.priority && (
                        <span 
                          className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getPriorityColor(story.jiraMetadata.priority)}`}
                        >
                          {getPriorityIcon(story.jiraMetadata.priority)} {story.jiraMetadata.priority}
                        </span>
                      )}
                      
                      {/* Story Points - 헥사곤 모양 느낌 */}
                      {story.jiraMetadata.storyPoints && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-500 text-white">
                          {story.jiraMetadata.storyPoints}SP
                        </span>
                      )}
                      
                      {/* Assignee - 회색 pill 모양 */}
                      {story.jiraMetadata.assignee && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
                          👤 {story.jiraMetadata.assignee}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
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
                  className="story-description text-sm text-gray-600 mt-2 line-clamp-2"
                >
                  {story.description}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      
      {/* Context Menu */}
      {contextMenu && isHost && (
        <div
          className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => handleContextMenuAction('select')}
          >
            📋 투표 안건으로 선택
          </button>
        </div>
      )}
    </div>
  );
};
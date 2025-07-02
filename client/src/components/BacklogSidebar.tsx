import React, { useState } from 'react';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface BacklogSidebarProps {
  stories: any[];
}

export const BacklogSidebar: React.FC<BacklogSidebarProps> = ({ stories }) => {
  const { room, isHost } = useRoom();
  const { send } = useWebSocket();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; storyId: string } | null>(null);

  if (!room) return null;

  const { currentStoryId } = room;

  const handleSelectStory = (storyId: string) => {
    if (!isHost) return;
    
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

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    voting: '🗳️',
    revealed: '👁️',
    closed: '✅',
    skipped: '⏭️'
  };

  if (stories.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Backlog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No stories yet.</p>
            {isHost && <p className="text-xs mt-1">Add stories to get started.</p>}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle className="text-lg flex items-center justify-between">
          Backlog
          <Badge variant="secondary" className="text-xs">
            {stories.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-3">
        <div className="h-full overflow-y-auto">
          <div className="space-y-2 pr-3">
            {stories.map(story => {
              const isActive = story.id === currentStoryId;
              const statusIcon = statusIcons[story.status] || '❓';
              
              return (
                <div
                  key={story.id}
                  data-testid={`story-item-${story.id}`}
                  className={`p-3 border rounded-lg bg-white transition-all duration-200 cursor-pointer hover:border-gray-300 hover:shadow-sm ${
                    isActive ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200'
                  }`}
                  onClick={(e) => handleCardClick(story, e)}
                  onContextMenu={(e) => handleContextMenu(e, story.id)}
                >
                  {/* Story Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate leading-tight">
                        {story.title}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <span className="text-sm" title={story.status}>{statusIcon}</span>
                      {story.final_point !== undefined && story.final_point !== null && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {story.final_point}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Jira Metadata - Compact */}
                  {story.jiraMetadata && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span 
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getIssueTypeColor(story.jiraMetadata.issueType)}`}
                      >
                        {story.jiraMetadata.issueType}
                      </span>
                      
                      {story.jiraMetadata.priority && (
                        <span 
                          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs ${getPriorityColor(story.jiraMetadata.priority)}`}
                        >
                          {getPriorityIcon(story.jiraMetadata.priority)}
                        </span>
                      )}
                      
                      {story.jiraMetadata.storyPoints && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-indigo-500 text-white">
                          {story.jiraMetadata.storyPoints}SP
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description - Truncated */}
                  {story.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {story.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      
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
    </Card>
  );
};
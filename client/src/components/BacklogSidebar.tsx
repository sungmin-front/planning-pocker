import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRoom } from '@/contexts/RoomContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ContextMenu } from '@/components/ui/context-menu';
import { AddStoryModal } from '@/components/HostControls/AddStoryModal';
import { JiraIntegrationModal } from '@/components/HostControls/JiraIntegrationModal';
import { Plus, FileText, ChevronsUp, ChevronUp, Menu, ChevronDown, ChevronsDown } from 'lucide-react';

interface BacklogSidebarProps {
  stories: any[];
}

export const BacklogSidebar: React.FC<BacklogSidebarProps> = ({ stories }) => {
  const { room, isHost, syncRoom } = useRoom();
  const { send } = useWebSocket();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; story: any } | null>(null);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);

  if (!room) return null;

  const { currentStoryId } = room;

  const handleSelectStory = (storyId: string) => {
    if (!isHost) return;
    
    send({
      type: 'STORY_SELECT',
      payload: { storyId }
    });
  };

  const handleOpenJiraLink = (jiraUrl: string) => {
    window.open(jiraUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = (story: any, event: React.MouseEvent) => {
    event.preventDefault();
    
    const availableActions = [];
    
    // Add Jira link action if available
    if (story.jiraMetadata?.jiraUrl) {
      availableActions.push({
        id: 'open-link',
        label: 'Jira 이슈 열기',
        icon: '🔗',
        action: () => handleOpenJiraLink(story.jiraMetadata.jiraUrl)
      });
    }
    
    // Add select action for hosts
    if (isHost) {
      availableActions.push({
        id: 'select-story',
        label: '투표 안건으로 선택',
        icon: '📋',
        action: () => handleSelectStory(story.id)
      });
    }
    
    // If only one action, execute it directly
    if (availableActions.length === 1) {
      availableActions[0].action();
      return;
    }
    
    // If multiple actions, show context menu
    if (availableActions.length > 1) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        story: { ...story, availableActions }
      });
    }
  };

  const getContextMenuItems = () => {
    if (!contextMenu?.story?.availableActions) return [];
    
    return contextMenu.story.availableActions.map((action: any) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      onClick: action.action
    }));
  };

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
      case 'low': case 'lowest': return 'border-blue-300 bg-blue-50 text-blue-700';
      default: return 'border-gray-300 bg-gray-50 text-gray-700';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'highest': return <ChevronsUp className="h-3 w-3" />;
      case 'high': return <ChevronUp className="h-3 w-3" />;
      case 'medium': return <Menu className="h-3 w-3" />;
      case 'low': return <ChevronDown className="h-3 w-3" />;
      case 'lowest': return <ChevronsDown className="h-3 w-3" />;
      default: return <Menu className="h-3 w-3" />;
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
      <>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Backlog
              {isHost && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => setIsAddStoryModalOpen(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsJiraModalOpen(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No stories yet.</p>
              {isHost && <p className="text-xs mt-1">Use the + button to add stories.</p>}
            </div>
          </CardContent>
        </Card>
        
        {/* Modals */}
        {isHost && (
          <>
            <AddStoryModal 
              isOpen={isAddStoryModalOpen} 
              onClose={() => setIsAddStoryModalOpen(false)} 
            />
            
            <JiraIntegrationModal
              isOpen={isJiraModalOpen}
              onClose={() => setIsJiraModalOpen(false)}
              roomId={room.id}
              onStoriesImported={() => {
                syncRoom();
              }}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-none">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              Backlog
              <Badge variant="secondary" className="text-xs">
                {stories.length}
              </Badge>
            </div>
            {isHost && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => setIsAddStoryModalOpen(true)}
                  className="h-6 px-2 text-xs"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsJiraModalOpen(true)}
                  className="h-6 px-2 text-xs"
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            )}
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
                >
                  {/* Story Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs text-gray-900 line-clamp-2 leading-tight">
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
      
      {/* Context Menu - Portal to body to avoid sidebar clipping */}
      {contextMenu && createPortal(
        <ContextMenu
          isOpen={!!contextMenu}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />,
        document.body
      )}
    </Card>
      
      {/* Modals */}
      {isHost && (
        <>
          <AddStoryModal 
            isOpen={isAddStoryModalOpen} 
            onClose={() => setIsAddStoryModalOpen(false)} 
          />
          
          <JiraIntegrationModal
            isOpen={isJiraModalOpen}
            onClose={() => setIsJiraModalOpen(false)}
            roomId={room.id}
            onStoriesImported={() => {
              syncRoom();
            }}
          />
        </>
      )}
    </>
  );
};
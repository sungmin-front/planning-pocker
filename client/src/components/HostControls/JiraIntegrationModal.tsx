import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { JiraIntegration } from './JiraIntegration';

interface JiraIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onStoriesImported: () => void;
}

export const JiraIntegrationModal: React.FC<JiraIntegrationModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onStoriesImported
}) => {
  const handleStoriesImported = () => {
    onStoriesImported();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jira 연동</DialogTitle>
        </DialogHeader>
        <JiraIntegration
          roomId={roomId}
          onStoriesImported={handleStoriesImported}
        />
      </DialogContent>
    </Dialog>
  );
};
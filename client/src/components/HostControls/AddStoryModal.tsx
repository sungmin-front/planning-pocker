import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';
import { AddStoryForm } from './AddStoryForm';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStoryModal: React.FC<AddStoryModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Story</DialogTitle>
        </DialogHeader>
        <AddStoryForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
};
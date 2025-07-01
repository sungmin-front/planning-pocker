import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface AddStoryFormProps {
  onClose: () => void;
}

export const AddStoryForm: React.FC<AddStoryFormProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { socket } = useWebSocket();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !socket) return;
    
    setIsSubmitting(true);
    
    socket.emit('story:add', {
      title: title.trim(),
      description: description.trim() || undefined
    }, (response: { success: boolean; error?: string }) => {
      setIsSubmitting(false);
      if (response.success) {
        onClose();
      } else {
        // Handle error
        console.error(response.error);
      }
    });
  };
  
  const isTitleValid = title.trim().length > 0;
  
  return (
    <form onSubmit={handleSubmit} className="add-story-form space-y-4">
      <div className="form-group space-y-2">
        <Label htmlFor="story-title">Title</Label>
        <Input
          id="story-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter story title"
          required
        />
      </div>
      
      <div className="form-group space-y-2">
        <Label htmlFor="story-description">Description (optional)</Label>
        <Textarea
          id="story-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter story details"
          rows={4}
        />
      </div>
      
      <div className="form-actions flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isTitleValid || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Story'}
        </Button>
      </div>
    </form>
  );
};
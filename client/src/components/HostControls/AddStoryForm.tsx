import React, { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { Textarea } from '@/components/ui/shadcn/textarea';
import { Label } from '@/components/ui/shadcn/label';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useToast } from '@/hooks/use-toast';

interface AddStoryFormProps {
  onClose: () => void;
}

export const AddStoryForm: React.FC<AddStoryFormProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { send, isConnected } = useWebSocket();
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isConnected) {
      toast({
        title: "Error",
        description: "Please ensure you're connected and enter a title",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Use the same message type as the server expects
    send({
      type: 'STORY_CREATE',
      payload: {
        title: title.trim(),
        description: description.trim() || undefined
      }
    });
    
    // Close the form and show success message
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      toast({
        title: "Story Added",
        description: `Story "${title.trim()}" has been created`,
      });
    }, 500);
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
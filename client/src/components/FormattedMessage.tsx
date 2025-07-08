import React from 'react';
import { formatChatMessage } from '@/utils/messageFormatter';

interface FormattedMessageProps {
  content: string;
  className?: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, className = '' }) => {
  const formattedContent = formatChatMessage(content);

  return (
    <div 
      className={`formatted-message prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      style={{
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        color: 'inherit'
      }}
    />
  );
};
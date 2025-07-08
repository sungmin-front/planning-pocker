import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, X } from 'lucide-react';

export const FormattingHelpTooltip: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0"
        aria-label="Formatting help"
      >
        <HelpCircle className="h-4 w-4" />
      </Button>

      {isOpen && (
        <Card className="absolute bottom-full right-0 mb-2 w-64 z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Message Formatting</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              <strong>**bold text**</strong> → <strong>bold text</strong>
            </div>
            <div>
              <strong>*italic text*</strong> → <em>italic text</em>
            </div>
            <div>
              <strong>`code text`</strong> → <code className="bg-gray-100 px-1 rounded">code text</code>
            </div>
            <div>
              <strong>Emojis:</strong> :smile: :heart: :thumbsup:
            </div>
            <div className="text-gray-600 mt-2">
              Tip: You can combine formatting styles!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
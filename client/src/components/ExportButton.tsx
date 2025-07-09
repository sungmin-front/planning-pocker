import React, { useState } from 'react';
import { Button } from './ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/shadcn/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText, ExternalLink } from 'lucide-react';
import { exportUtils } from '@/utils/export';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  roomId: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const ExportButton: React.FC<ExportButtonProps> = ({ 
  roomId, 
  className,
  size = 'default',
  variant = 'outline'
}) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async (type: 'json' | 'csv' | 'html') => {
    if (isExporting) return;
    
    setIsExporting(type);
    try {
      switch (type) {
        case 'json':
          await exportUtils.downloadJson(roomId);
          toast({
            title: 'JSON Export Complete',
            description: 'Session data has been downloaded as JSON.',
          });
          break;
        case 'csv':
          await exportUtils.downloadCsv(roomId);
          toast({
            title: 'CSV Export Complete',
            description: 'Session data has been downloaded as CSV.',
          });
          break;
        case 'html':
          await exportUtils.downloadHtml(roomId);
          toast({
            title: 'HTML Report Complete',
            description: 'Session report has been downloaded as HTML.',
          });
          break;
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: `Failed to export ${type.toUpperCase()}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(null);
    }
  };

  const handleViewReport = () => {
    exportUtils.openHtmlInNewTab(roomId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={!!isExporting}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleExport('html')}>
          <FileText className="h-4 w-4 mr-2" />
          Download HTML Report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewReport}>
          <ExternalLink className="h-4 w-4 mr-2" />
          View Report in New Tab
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          Download JSON Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download CSV Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
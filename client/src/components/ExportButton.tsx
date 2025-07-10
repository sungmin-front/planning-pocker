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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const handleExport = async (type: 'json' | 'csv' | 'html') => {
    if (isExporting) return;
    
    setIsExporting(type);
    try {
      switch (type) {
        case 'json':
          await exportUtils.downloadJson(roomId);
          toast({
            title: t('export.jsonComplete'),
            description: t('export.jsonDescription'),
          });
          break;
        case 'csv':
          await exportUtils.downloadCsv(roomId);
          toast({
            title: t('export.csvComplete'),
            description: t('export.csvDescription'),
          });
          break;
        case 'html':
          await exportUtils.downloadHtml(roomId);
          toast({
            title: t('export.htmlComplete'),
            description: t('export.htmlDescription'),
          });
          break;
      }
    } catch (error) {
      toast({
        title: t('export.failed'),
        description: t('export.failedDescription', { type: type.toUpperCase() }),
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
              {t('export.exporting')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {t('export.export')}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleExport('html')}>
          <FileText className="h-4 w-4 mr-2" />
          {t('export.downloadHtmlReport')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleViewReport}>
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('export.viewReportNewTab')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          {t('export.downloadJsonData')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          {t('export.downloadCsvData')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
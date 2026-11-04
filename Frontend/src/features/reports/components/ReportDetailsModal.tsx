import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { FileText } from 'lucide-react';

interface ReportDetailsModalProps {
  title: string;
  data: Record<string, any> | null;
  columns?: any[];
  onClose: () => void;
}

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ title, data, columns, onClose }) => {
  if (!data) return null;

  let displayFields: { key: string; label: string; value: React.ReactNode }[] = [];

  if (columns) {
    displayFields = columns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({
        key: col.key,
        label: col.header || col.key,
        value: col.render ? col.render(data) : data[col.key],
      }))
      .filter((item) => item.value !== undefined && item.value !== null);
  } else {
    displayFields = Object.entries(data)
      .filter(([key, value]) => !key.toLowerCase().endsWith('id') && value !== undefined && value !== null)
      .map(([key, value]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').trim(),
        value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
  }

  return (
    <Dialog open={Boolean(data)} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border/80 rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-6 border-b flex-shrink-0 bg-secondary/5 pr-12">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl border bg-primary/10 text-primary border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
                Detailed record view and property specifications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {displayFields.map(({ key, label, value }) => (
              <div 
                key={key} 
                className="p-3.5 rounded-xl border border-border/60 bg-secondary/10 hover:border-primary/20 transition-colors"
              >
                <dt className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-black text-foreground break-words flex items-center">
                  {value}
                </dd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t bg-secondary/5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-muted-foreground text-[11px]">
            {displayFields.length} field{displayFields.length !== 1 ? 's' : ''} available
          </span>
          <Button 
            onClick={onClose} 
            className="rounded-xl font-bold px-6 h-9"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDetailsModal;

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'default' | 'outline' | 'secondary' | 'destructive';
    className?: string;
  };
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  action,
}) => {
  return (
    <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b border-border/60 mb-6">
      <div className="space-y-1.5">
        {/* Breadcrumbs removed per user request */}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center pt-2 md:pt-0">
          <Button
            variant={action.variant || 'default'}
            onClick={action.onClick}
            className={action.className || "shadow-sm font-semibold flex items-center gap-1.5"}
          >
            {action.icon}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
export default PageHeader;

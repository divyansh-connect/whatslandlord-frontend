import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';

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
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  action,
  children,
}) => {
  return (
    <div className="flex flex-col space-y-3 sm:space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4 sm:pb-6 border-b border-border/60 mb-4 sm:mb-6">
      <div className="space-y-1 sm:space-y-1.5 min-w-0">
        {/* Breadcrumbs removed per user request */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground break-words">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(action || children) && (
        <div className="flex items-center gap-2 pt-1 md:pt-0 shrink-0 w-full sm:w-auto">
          {action && (
            <Button
              variant={action.variant || 'default'}
              onClick={action.onClick}
              className={clsx("shadow-sm font-semibold flex items-center justify-center gap-1.5 w-full sm:w-auto text-xs sm:text-sm", action.className)}
            >
              {action.icon}
              {action.label}
            </Button>
          )}
          {children}
        </div>
      )}
    </div>
  );
};
export default PageHeader;

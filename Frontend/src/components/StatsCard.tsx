import React from 'react';
import { Card } from './ui/Card';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  loading?: boolean;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  description,
  trend,
  trendLabel,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return (
      <Card className="p-6 relative overflow-hidden animate-pulse">
        <div className="flex justify-between items-start">
          <div className="space-y-3 w-2/3">
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-lg" />
        </div>
        <div className="mt-4 h-4 bg-muted rounded w-full" />
      </Card>
    );
  }

  return (
    <Card 
      onClick={onClick}
      className={clsx(
        "p-4 sm:p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group border-border bg-card",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold tracking-wide text-muted-foreground uppercase truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground transition-all duration-200 group-hover:text-primary truncate">
            {value}
          </p>
        </div>
        <div className="p-2.5 sm:p-3 bg-secondary/80 group-hover:bg-primary/10 group-hover:text-primary rounded-xl text-muted-foreground transition-all duration-300 shrink-0">
          {icon}
        </div>
      </div>

      {(trend || description) && (
        <div className="mt-4 flex items-center space-x-2 text-xs">
          {trend === 'up' && (
            <span className="flex items-center text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              {trendLabel}
            </span>
          )}
          {trend === 'down' && (
            <span className="flex items-center text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              {trendLabel}
            </span>
          )}
          {trend === 'neutral' && (
            <span className="flex items-center text-slate-500 font-bold bg-slate-500/10 px-1.5 py-0.5 rounded">
              {trendLabel}
            </span>
          )}
          {description && (
            <span className="text-muted-foreground truncate">{description}</span>
          )}
        </div>
      )}
    </Card>
  );
};
export default StatsCard;

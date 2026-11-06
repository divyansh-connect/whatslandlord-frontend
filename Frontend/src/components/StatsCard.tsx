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

  const valStr = String(value ?? '');
  const isExtraLong = valStr.length > 10;
  const isLong = valStr.length > 7;
  const valueFontSize = isExtraLong
    ? "text-lg sm:text-xl"
    : isLong
    ? "text-xl sm:text-2xl"
    : "text-2xl sm:text-3xl";

  return (
    <Card 
      onClick={onClick}
      className={clsx(
        "p-4 sm:p-5 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative group border-border bg-card flex flex-col justify-between min-h-[128px]",
        onClick && "cursor-pointer hover:border-primary/50 hover:bg-card/90"
      )}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase leading-tight line-clamp-2 min-h-[26px] flex items-center">
            {title}
          </p>
          <p
            className={clsx(
              valueFontSize,
              "font-black tracking-tight text-foreground transition-all duration-200 group-hover:text-primary whitespace-nowrap overflow-visible leading-tight"
            )}
            title={valStr}
          >
            {value}
          </p>
        </div>
        <div className="p-2 sm:p-2.5 bg-secondary/80 group-hover:bg-primary/10 group-hover:text-primary rounded-xl text-muted-foreground transition-all duration-300 shrink-0">
          {icon}
        </div>
      </div>

      {(trend || description) && (
        <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5 text-[10.5px]">
          {trend === 'up' && (
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
              <ArrowUpRight className="w-3 h-3 mr-0.5 shrink-0" />
              {trendLabel}
            </span>
          )}
          {trend === 'down' && (
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-rose-600 dark:text-rose-400 font-extrabold bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px]">
              <ArrowDownRight className="w-3 h-3 mr-0.5 shrink-0" />
              {trendLabel}
            </span>
          )}
          {trend === 'neutral' && (
            <span className="inline-flex items-center whitespace-nowrap shrink-0 text-slate-600 dark:text-slate-400 font-extrabold bg-slate-500/10 px-1.5 py-0.5 rounded text-[10px]">
              {trendLabel}
            </span>
          )}
          {description && (
            <span className="text-muted-foreground font-medium truncate max-w-[130px]" title={description}>
              {description}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
export default StatsCard;

import React, { useState } from 'react';
import { Sparkles, Headphones } from 'lucide-react';
import { AIGuideModal } from './AIGuideModal';

interface AIGuideButtonProps {
  pageKey: string;
  variant?: 'pill' | 'compact' | 'outline';
  className?: string;
  label?: string;
}

export const AIGuideButton: React.FC<AIGuideButtonProps> = ({
  pageKey,
  variant = 'pill',
  className = '',
  label = 'AI Guide',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`relative p-2 rounded-xl bg-card border border-indigo-500/30 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-all shadow-sm group ${className}`}
          title="Open AI Page Guide"
        >
          <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform text-indigo-500" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        </button>
      ) : variant === 'outline' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-card hover:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-xs font-bold transition-all shadow-sm hover:border-indigo-500/60 ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{label}</span>
        </button>
      ) : (
        // Premium default pill with animated gradient glow
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`group relative inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${className}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-100 group-hover:rotate-12 transition-transform" />
          <span className="tracking-wide">{label}</span>
          <Headphones className="w-3 h-3 text-indigo-200 opacity-80" />
        </button>
      )}

      {/* Standalone AI Modal */}
      <AIGuideModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pageKey={pageKey}
      />
    </>
  );
};


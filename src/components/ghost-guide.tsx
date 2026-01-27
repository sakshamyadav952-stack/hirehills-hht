
'use client';

import { cn } from '@/lib/utils';
import { MousePointerClick } from 'lucide-react';

interface GhostGuideProps {
  show: boolean;
  onToggle: () => void;
}

export function GhostGuide({ show, onToggle }: GhostGuideProps) {
  return (
    <div
      className={cn(
        'absolute top-2 left-2 z-50 flex items-center gap-2 transition-all duration-500 ease-in-out',
        show ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'
      )}
    >
      <div
        className="relative w-24 h-24 cursor-pointer group"
        onClick={onToggle}
      >
        {/* Ghost Body */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-slate-200/80 backdrop-blur-sm rounded-t-full animate-float">
          {/* Eyes */}
          <div className="absolute top-7 left-1/2 -translate-x-1/2 flex gap-3">
            <div className="w-3 h-3 bg-slate-800 rounded-full animate-blink"></div>
            <div className="w-3 h-3 bg-slate-800 rounded-full animate-blink animation-delay-200"></div>
          </div>
          {/* Mouth */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-4 h-2 bg-slate-800 rounded-full group-hover:scale-y-50 transition-transform"></div>
          {/* Bottom */}
          <div className="absolute bottom-0 left-0 w-full h-4 overflow-hidden">
            <div className="w-5 h-5 bg-background rounded-full absolute -bottom-2 left-0"></div>
            <div className="w-5 h-5 bg-background rounded-full absolute -bottom-2 left-1/2 -translate-x-1/2"></div>
            <div className="w-5 h-5 bg-background rounded-full absolute -bottom-2 right-0"></div>
          </div>
        </div>
        {/* Shadow */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-black/20 rounded-full blur-sm animate-shadow"></div>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-card/80 backdrop-blur-sm border animate-fade-in-right">
        <MousePointerClick className="w-6 h-6 text-primary" />
        <span className="text-sm font-medium">Expand</span>
      </div>
    </div>
  );
}


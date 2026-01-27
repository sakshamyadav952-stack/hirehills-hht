
'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Coins, User, Clock, Hourglass, Star } from 'lucide-react';
import type { KuberBlock } from '@/lib/types';
import { cn } from '@/lib/utils';

export function KuberBlockItem({ block }: { block: KuberBlock }) {
  const [tBlocPoints, setTBlocPoints] = useState(0);
  const animationFrameRef = useRef<number>();

  const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
  const durationHours = durationMs / (1000 * 60 * 60);
  const totalKuberPoints = durationHours * 0.25;

  useEffect(() => {
    const tBlocRatePerHour = 0.25;
    const tBlocRatePerMs = tBlocRatePerHour / (1000 * 60 * 60);
    
    const now = Date.now();
    const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
    const startPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);

    setTBlocPoints(startPoints);

    if (startPoints >= totalKuberPoints) {
      // If we are already at or past the max, just set it and exit.
      setTBlocPoints(totalKuberPoints);
      return;
    }

    const animate = () => {
      const currentMs = Date.now();
      const currentElapsedMs = Math.max(0, currentMs - block.userSessionStartTime);
      const currentSimulatedPoints = Math.min(currentElapsedMs * tBlocRatePerMs, totalKuberPoints);
      
      setTBlocPoints(currentSimulatedPoints);

      if (currentSimulatedPoints < totalKuberPoints) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [block.userSessionStartTime, totalKuberPoints]);


  return (
    <div className="space-y-2">
      <div className="p-4 border rounded-lg bg-muted/50 relative overflow-hidden space-y-3">
        {/* Top section: User and Points */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{block.referralName}</span>
            </div>
            
            <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-amber-400 relative">
                    <Star className="h-5 w-5" />
                    <span className="font-bold text-lg">{totalKuberPoints.toFixed(4)}</span>
                    <span className="text-sm">Points</span>
                </div>
                 {/* t-bloc display */}
                <div className="w-full max-w-[150px] p-1.5 border border-white rounded-md text-center mx-auto">
                    <p className="text-xs font-semibold">t-bloc</p>
                    <p className="font-mono text-sm font-bold">{tBlocPoints.toFixed(4)}</p>
                </div>
            </div>
        </div>

        {/* Bottom section: Timestamps */}
        <div className="pt-3 border-t border-border/50 space-y-2 text-sm">
            <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                    <p className="font-medium">Referral's Session Start</p>
                    <p className="text-muted-foreground">{format(new Date(block.userSessionStartTime), 'PPpp')}</p>
                </div>
            </div>
            <div className="flex items-start gap-3">
                <Hourglass className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                    <p className="font-medium">Your Session End</p>
                    <p className="text-muted-foreground">{format(new Date(block.referralSessionEndTime), 'PPpp')}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

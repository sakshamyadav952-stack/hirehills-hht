
'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2, Users, Coins, Clock, Pyramid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import type { KuberBlock } from '@/lib/types';


export function ReferralList() {
  const { allReferrals, referralsLoading, userProfile } = useAuth();
  const [cumulativeFBloc, setCumulativeFBloc] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const kuberBlocks = userProfile?.kuberBlocks;
    if (!kuberBlocks || kuberBlocks.length === 0) {
      setCumulativeFBloc(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const tBlocRatePerMs = 0.25 / (1000 * 60 * 60);

    const animate = () => {
      const now = Date.now();
      let total = 0;

      kuberBlocks.forEach(block => {
        const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalKuberPoints = durationHours * 0.25;
        
        const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
        const currentSimulatedPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);
        
        total += currentSimulatedPoints;
      });

      setCumulativeFBloc(total);

      // Only continue animating if there are active calculations
      const isStillAnimating = kuberBlocks.some(block => {
        const totalKuberPoints = (Math.max(0, block.referralSessionEndTime - block.userSessionStartTime) / (1000 * 60 * 60)) * 0.25;
        const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
        const currentSimulatedPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);
        return currentSimulatedPoints < totalKuberPoints;
      });
      
      if (isStillAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [userProfile?.kuberBlocks]);


  if (referralsLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!allReferrals || allReferrals.length === 0) {
    return (
        <div className="text-center p-12 border-2 border-dashed border-cyan-400/20 rounded-lg">
            <Users className="mx-auto h-12 w-12 text-cyan-400/50" />
            <h3 className="mt-4 text-lg font-semibold">No Referrals Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Share your profile code to start earning referral bonuses!</p>
        </div>
    );
  }
  
  return (
    <div className="space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allReferrals.map((referral) => {
                const isReferralActive = referral.status === 'Active';
                 let sessionEndTime: Date | null = null;
                if (isReferralActive && referral.miningStartTime) {
                    sessionEndTime = new Date(referral.miningStartTime);
                    sessionEndTime.setHours(sessionEndTime.getHours() + 8);
                }

                return (
                <div key={referral.id} className="futuristic-card-bg-secondary p-4 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                         <Avatar className="h-12 w-12 border-2 border-cyan-400/30">
                            {referral.profileImageUrl && <AvatarImage src={referral.profileImageUrl} alt={referral.fullName} />}
                            <AvatarFallback><User /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="font-semibold">{referral.fullName}</div>
                             <div className="text-xs text-muted-foreground">
                                Joined: {formatDistanceToNow(new Date((referral.createdAt as any).seconds * 1000), { addSuffix: true })}
                            </div>
                            {isReferralActive && referral.miningStartTime && (
                                <div className="text-xs text-green-400 flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                        {new Date(referral.miningStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {sessionEndTime && ` - ${sessionEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                     <Badge
                        className={cn(
                            "text-xs font-bold border-2",
                            isReferralActive 
                                ? 'border-green-400/30 bg-green-500/10 text-green-300 shadow-[0_0_10px_rgba(74,222,128,0.3)]' 
                                : 'border-red-400/30 bg-red-500/10 text-red-300'
                        )}
                        variant="outline"
                    >
                        {referral.status}
                    </Badge>
                </div>
            )})}
        </div>
        
        <div className="mt-6 pt-4 border-t border-cyan-400/20">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-lime-400" />
                    <p className="font-semibold text-lime-300">Total Earnings from Referrals</p>
                </div>
                <p className="text-lg font-bold text-white">
                  {cumulativeFBloc.toFixed(4)}
                </p>
            </div>
             <p className="text-xs text-center text-muted-foreground pt-4">
                You get a 0.25 coin/hour mining boost for each active referral.
            </p>
        </div>
    </div>
  );
}

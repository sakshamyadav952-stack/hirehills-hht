'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Gift, PackageOpen, Clapperboard, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

type CooldownType = '2H' | '4H' | '8H';

interface MysteryBoxProps {
  type: CooldownType;
  userProfile: UserProfile | null;
  isSessionActive: boolean;
}

export function MysteryBox({ type, userProfile, isSessionActive }: MysteryBoxProps) {
  const { updateMiningRate, adCooldownEndTime, startAdCooldown, canWatchAd } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [showWinningsDialog, setShowWinningsDialog] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [adCooldownRemaining, setAdCooldownRemaining] = useState(0);
  const [multiplier, setMultiplier] = useState(1.5);

  const hours = parseInt(type.replace('H', ''));

  // Calculate how many boosts have been used in the current session
  const boostCount = useMemo(() => {
    if (!userProfile?.miningStartTime) return 0;
    return (userProfile.activeBoosts || []).filter(
      b => b.type === type && b.startTime >= userProfile.miningStartTime!
    ).length;
  }, [userProfile?.activeBoosts, userProfile?.miningStartTime, type]);

  const isLimitReached = boostCount >= 5;

  useEffect(() => {
    if (!adCooldownEndTime) {
      setAdCooldownRemaining(0);
      return;
    }

    const updateAdCooldown = () => {
      const now = Date.now();
      const remaining = Math.max(0, adCooldownEndTime - now);
      setAdCooldownRemaining(remaining);
    };

    updateAdCooldown();
    const interval = setInterval(updateAdCooldown, 1000);

    return () => clearInterval(interval);
  }, [adCooldownEndTime]);

  const handleOpen = useCallback(() => {
    if (isOpening || isLimitReached || !userProfile || !isSessionActive) return;
    setIsOpening(true);
    
    setTimeout(() => {
      setIsOpening(false);
      setShowWinningsDialog(true);
      setRewardClaimed(false);
      setMultiplier(1.5 + Math.random() * 1.5); // Random multiplier between 1.5 and 3.0
    }, 800);
  }, [isOpening, isLimitReached, userProfile, isSessionActive]);

  const handleWatchAd = async () => {
    if (!userProfile) return;
    
    const boostRate = 0.1;
    
    if (typeof window !== 'undefined' && window.Android && typeof window.Android.showRewardedAd === "function") {
        window.Android.showRewardedAd();
    }

    await updateMiningRate(type, boostRate, true);
    setClaimedAmount(boostRate);
    setRewardClaimed(true);
  };

  const handleCloseConfirmation = () => {
      setShowWinningsDialog(false);
      startAdCooldown();
  };
  
  const isButtonDisabled = isOpening || isLimitReached || !isSessionActive;

  return (
    <div className="w-full">
      {isLimitReached ? (
        <Button disabled className="w-full h-14 bg-slate-800 text-slate-400 border border-slate-700 opacity-80">
          5/5 BOOSTS APPLIED
        </Button>
      ) : (
        <Button 
          onClick={handleOpen} 
          disabled={isButtonDisabled} 
          className="w-full h-14 bg-amber-500 text-black font-bold shadow-lg border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0 transition-all"
        >
          {isOpening ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : !isSessionActive ? (
            "Start Mining to Boost Speed"
          ) : (
            <>
              <Gift className="mr-2 h-5 w-5" />
              Open Mystery Box ({boostCount}/5)
            </>
          )}
        </Button>
      )}

      <AlertDialog open={showWinningsDialog} onOpenChange={setShowWinningsDialog}>
        <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
          {rewardClaimed ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-green-400 text-center">✅ Boost Applied!</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-green-300/80 pt-2">
                  Your mining rate has been increased by{' '}
                  <span className="font-bold text-white">+{claimedAmount.toFixed(2)} BLIT/hr</span> for the next {hours} hours!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                 <AlertDialogAction onClick={handleCloseConfirmation} className="w-full bg-slate-600 text-white hover:bg-slate-500">Close</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-amber-300 text-center">Speed Boost Available</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-amber-200/80 pt-2">
                  Watch a short ad to increase your mining speed by <span className="font-bold text-white">+0.10 BLIT/hr</span> for the next {hours} hours.
                  <br />
                  <span className="text-xs mt-3 block text-amber-200/60 font-medium">(You can stack this boost up to 5 times per session)</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 pt-4">
                    <Button 
                        onClick={handleWatchAd} 
                        className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold shadow-lg border-b-4 border-amber-700 active:border-b-0" 
                        size="lg" 
                        disabled={adCooldownRemaining > 0}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Clapperboard className="h-5 w-5" />
                            <span>
                                {adCooldownRemaining > 0
                                ? `Next Ad in: ${Math.ceil(adCooldownRemaining / 1000)}s`
                                : "Watch Ad to Boost"}
                            </span>
                        </div>
                    </Button>
                </div>
              <AlertDialogFooter>
                <Button variant="ghost" onClick={() => setShowWinningsDialog(false)} className="w-full text-white/60 hover:text-white">
                    Cancel
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

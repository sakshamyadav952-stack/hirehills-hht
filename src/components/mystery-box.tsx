'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
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
  const { updateMiningRate, adCooldownEndTime, startAdCooldown } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [showWinningsDialog, setShowWinningsDialog] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [adCooldownRemaining, setAdCooldownRemaining] = useState(0);

  const hours = parseInt(type.replace('H', ''));

  // Calculate how many 8H boosts have been used in the current session
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
    
    // Simulate a brief "unlocking" delay
    setTimeout(() => {
      setIsOpening(false);
      setShowWinningsDialog(true);
      setRewardClaimed(false);
    }, 800);
  }, [isOpening, isLimitReached, userProfile, isSessionActive]);

  const handleWatchAd = async () => {
    if (!userProfile) return;
    
    const boostRate = 0.1;
    
    // Trigger the native rewarded ad if available, otherwise simulate
    if (typeof window !== 'undefined' && window.Android && typeof window.Android.showRewardedAd === "function") {
        window.Android.showRewardedAd();
    } else {
        console.log("Ad started (simulated environment)");
    }

    // Apply the fixed 0.1 boost
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
    <>
      <div className="flex flex-col items-center gap-2">
        <div
            className={cn(
            "relative overflow-hidden aspect-square w-full transition-transform duration-300 rounded-lg futuristic-card-bg-secondary",
            !isButtonDisabled ? 'cursor-pointer' : 'cursor-not-allowed',
            isShaking && !isButtonDisabled ? 'animate-shake' : ''
            )}
            onMouseEnter={() => !isButtonDisabled && setIsShaking(true)}
            onMouseLeave={() => setIsShaking(false)}
            onClick={handleOpen}
        >
            <Image
                src={isLimitReached ? "https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/Open_box_image.jpeg?alt=media&token=70d9dc2c-d8d0-416e-b24a-203cb8d827bf" : "https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/closed_box_image.jpeg?alt=media&token=59f444ae-f69a-4168-a49a-85dd9cd6a675"}
                alt={isLimitReached ? "Mystery Box Open" : "Mystery Box Closed"}
                fill
                priority
                sizes="(max-width: 768px) 33vw, 100vw"
                className={cn("object-cover transition-opacity", isButtonDisabled && !isLimitReached ? 'opacity-50' : 'opacity-100')}
            />
            {isLimitReached && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <span className="text-white font-bold text-sm bg-black/60 px-2 py-1 rounded shadow-lg border border-white/20">5/5 BOOSTED</span>
                </div>
            )}
        </div>
        <div className="h-10 w-full">
            {isLimitReached ? (
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">Boost Limit Reached</p>
                    <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-tighter">Resets next session</p>
                </div>
            ) : (
                <Button 
                    onClick={handleOpen} 
                    disabled={isButtonDisabled} 
                    size="sm" 
                    className="w-full bg-amber-500 text-black font-bold shadow-md border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0"
                >
                    {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : `Boost (${boostCount}/5)`}
                </Button>
            )}
        </div>
      </div>

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
    </>
  );
}

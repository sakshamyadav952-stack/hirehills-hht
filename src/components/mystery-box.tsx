

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Gift, PackageOpen, Clapperboard } from 'lucide-react';
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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { query, collection, where, limit, onSnapshot } from 'firebase/firestore';

type CooldownType = '2H' | '4H' | '8H';

interface MysteryBoxProps {
  type: CooldownType;
  userProfile: UserProfile | null;
  isSessionActive: boolean;
}

const multipliers = [1.5, 2, 2.5, 3];


export function MysteryBox({ type, userProfile, isSessionActive }: MysteryBoxProps) {
  const { updateMiningRate, adCooldownEndTime, startAdCooldown, canWatchAd } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [winnings, setWinnings] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState(1.5);
  const [cooldownTime, setCooldownTime] = useState('');
  const [inCooldown, setInCooldown] = useState(false);
  const [showWinningsDialog, setShowWinningsDialog] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  const [adCooldownRemaining, setAdCooldownRemaining] = useState(0);
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [isOpen, setIsOpen] = useState(false);


  useEffect(() => {
    // This check runs on the client and determines if the Android interface is available.
    setIsAndroidApp(typeof window.Android !== 'undefined');
  }, []);

  const hours = parseInt(type.replace('H', ''));

  const formatTime = (ms: number) => {
    if (ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const applyReward = useCallback(async (multiplierValue: number) => {
    if (winnings === null) return;
    const finalBoost = winnings * multiplierValue;
    const adWatched = multiplierValue > 1;
    await updateMiningRate(type, finalBoost, adWatched);
    setClaimedAmount(finalBoost);
  }, [winnings, type, updateMiningRate]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    // Find the latest cooldown for this box type from the activeBoosts array
    const relevantBoosts = userProfile?.activeBoosts?.filter(b => b.type === type) || [];
    const latestBoost = relevantBoosts.sort((a, b) => b.endTime - a.endTime)[0];

    if (latestBoost && Date.now() < latestBoost.endTime) {
      setIsOpen(true);
      setInCooldown(true);
      interval = setInterval(() => {
        const now = Date.now();
        const remainingMs = latestBoost.endTime - now;
        if (remainingMs > 0) {
          setCooldownTime(formatTime(remainingMs));
        } else {
          setCooldownTime('00:00:00');
          setInCooldown(false);
          setIsOpen(false);
          clearInterval(interval);
        }
      }, 1000);
    } else {
      setInCooldown(false);
      setIsOpen(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userProfile?.activeBoosts, type]);
  
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

  const handleOpen = useCallback(async () => {
    if (isOpening || inCooldown || !userProfile || !isSessionActive) return;

    setIsOpening(true);
    setIsOpen(true); // Open the box visually immediately
    
    const rateIncrease = Math.random() * (0.1 - 0.01) + 0.01;

    setTimeout(() => {
      const randomMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      
      setWinnings(rateIncrease);
      setMultiplier(randomMultiplier);
      setRewardClaimed(false);
      setClaimedAmount(0);
      setIsOpening(false);
      setShowWinningsDialog(true);
      
    }, 1000); // Short delay for animation
  }, [isOpening, inCooldown, userProfile, isSessionActive]);

  const handleWatchAd = async () => {
    if (!userProfile || winnings === null) return;
    
    setShowWinningsDialog(false); // Close the initial dialog

    // Immediately grant the reward
    await applyReward(multiplier);
    setIsOpen(true); // Mark box as open
    
    // Show confirmation after a delay
    setTimeout(() => {
      setRewardClaimed(true);
      setShowWinningsDialog(true); // Re-open with confirmation content
    }, 5000);

    // Then, command the native app to show the ad
    if (isAndroidApp && window.Android && typeof window.Android.showRewardedAd === "function") {
        window.Android.showRewardedAd();
        console.log("Ad started for user:", userProfile.id);
    } else {
        console.log("Ad feature not available in this environment.");
    }
  };

  const handleClaimBaseReward = async () => {
      if (winnings === null || rewardClaimed) return;
      await applyReward(1);
      setIsOpen(true); // Mark box as open
      setRewardClaimed(true);
  };
  
  const handleCloseConfirmation = () => {
      setShowWinningsDialog(false);
      startAdCooldown();
  };
  
  const isButtonDisabled = isOpening || inCooldown || !isSessionActive;

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div
            className={cn(
            "relative overflow-hidden aspect-square w-full transition-transform duration-300 rounded-lg futuristic-card-bg-secondary",
            !isButtonDisabled ? 'cursor-pointer' : 'cursor-not-allowed',
            isShaking && !isOpen && !isButtonDisabled ? 'animate-shake' : ''
            )}
            onMouseEnter={() => !isOpen && !isButtonDisabled && setIsShaking(true)}
            onMouseLeave={() => setIsShaking(false)}
            onClick={handleOpen}
        >
            <Image
                src={isOpen ? "https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/Open_box_image.jpeg?alt=media&token=70d9dc2c-d8d0-416e-b24a-203cb8d827bf" : "https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/closed_box_image.jpeg?alt=media&token=59f444ae-f69a-4168-a49a-85dd9cd6a675"}
                alt={isOpen ? "Mystery Box Open" : "Mystery Box Closed"}
                fill
                priority
                sizes="(max-width: 768px) 33vw, 100vw"
                className={cn("object-cover transition-opacity", isButtonDisabled && !isOpen ? 'opacity-50' : 'opacity-100')}
            />
        </div>
        <div className="h-10 w-full">
            {inCooldown ? (
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">Next box in:</p>
                    <p className="text-sm font-mono font-semibold">{cooldownTime}</p>
                </div>
            ) : (
                <Button 
                    onClick={handleOpen} 
                    disabled={isButtonDisabled} 
                    size="sm" 
                    className="w-full bg-amber-500 text-black font-bold shadow-md border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0"
                >
                    {isOpening ? 'Opening...' : 'Open'}
                </Button>
            )}
        </div>
      </div>

      <AlertDialog open={showWinningsDialog} onOpenChange={setShowWinningsDialog}>
        <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
          {rewardClaimed ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-green-400 text-center">✅ Reward Credited!</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-green-300/80 pt-2">
                  Your mining rate has been boosted by{' '}
                  <span className="font-bold text-white">+{claimedAmount.toFixed(4)} coins/hour</span>!
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                 <AlertDialogAction onClick={handleCloseConfirmation} className="w-full bg-slate-600 text-white hover:bg-slate-500">Close</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-bold text-amber-300 text-center">🎉 Congratulations! 🎉</AlertDialogTitle>
                <AlertDialogDescription className="text-center text-amber-200/80 pt-2">
                  You've won a mining rate boost of{' '}
                  <span className="font-bold text-white">
                    +{(winnings || 0).toFixed(4)} coins/hour
                  </span>{' '}
                  for the next {hours} {hours > 1 ? 'hours' : 'hour'}!
                  {userProfile?.adsUnlocked && canWatchAd && (
                    <>
                      {' '}Watch an ad to multiply it by <span className="font-bold text-white">x{multiplier}</span> for a total boost of{' '}
                      <span className="font-bold text-green-400">+{((winnings || 0) * multiplier).toFixed(4)} coins/hour!</span>
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 pt-4">
                    {userProfile?.adsUnlocked && canWatchAd && (
                        <Button onClick={handleWatchAd} className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold shadow-lg border-b-4 border-amber-700 active:border-b-0" size="lg" disabled={adCooldownRemaining > 0 || !isAndroidApp}>
                            <div className="flex items-center justify-center gap-2">
                                <Clapperboard className="h-5 w-5" />
                                <span>
                                    {adCooldownRemaining > 0
                                    ? `Next Ad in: ${Math.ceil(adCooldownRemaining / 1000)}s`
                                    : !isAndroidApp
                                    ? "Ad Not Available"
                                    : `Watch Ad for x${multiplier} Reward`}
                                </span>
                            </div>
                        </Button>
                    )}
                </div>
              <AlertDialogFooter>
                <AlertDialogAction onClick={handleClaimBaseReward} className="w-full bg-slate-600 text-white hover:bg-slate-500">
                    Claim +{(winnings || 0).toFixed(4)}/hr for {hours}H
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

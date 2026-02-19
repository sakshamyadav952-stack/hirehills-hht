"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/types';
import { WinningsAnimation } from './winnings-animation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, Loader2, AlertTriangle, Clapperboard } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface SpinWheelProps {
    onSpinEnd: (winnings: number) => Promise<void>;
    userProfile: UserProfile | null;
    isSessionActive: boolean;
}

const segments = [
    { value: 0.1, color: "#001f3f", labelColor: "#7FDBFF" },
    { value: 5, color: "#003366", labelColor: "#7FDBFF" },
    { value: 0.2, color: "#005b96", labelColor: "#7FDBFF" },
    { value: 3, color: "#39CCCC", labelColor: "#001f3f" },
    { value: 0.4, color: "#7FDBFF", labelColor: "#001f3f" }
];
const segmentCount = segments.length;
const segmentAngle = 360 / segmentCount;

const weightedSegments = [
  { value: 0.1, weight: 50 },
  { value: 0.2, weight: 40 },
  { value: 0.4, weight: 8 },
  { value: 3, weight: 1.5 },
  { value: 5, weight: 0.5 },
];

const totalWeight = weightedSegments.reduce((sum, s) => sum + s.weight, 0);

const getWeightedRandomSegmentValue = (excludeValue: number | null = null): number => {
    let currentSegments = weightedSegments;
    if (excludeValue !== null) {
        currentSegments = weightedSegments.filter(s => s.value !== excludeValue);
    }
    const currentTotalWeight = currentSegments.reduce((sum, s) => sum + s.weight, 0);

    let random = Math.random() * currentTotalWeight;
    for (let i = 0; i < currentSegments.length; i++) {
        const segment = currentSegments[i];
        if (random < segment.weight) {
        return segment.value;
        }
        random -= segment.weight;
    }
    return currentSegments[0].value;
};

const multipliers = [1.5, 2, 2.5, 3];


const WheelSegment = ({ index }: { index: number }) => {
    const angle = index * segmentAngle;
    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

    const x1 = 50 + 45 * Math.cos(Math.PI * (angle - 90) / 180);
    const y1 = 50 + 45 * Math.sin(Math.PI * (angle - 90) / 180);
    const x2 = 50 + 45 * Math.cos(Math.PI * (angle + segmentAngle - 90) / 180);
    const y2 = 50 + 45 * Math.sin(Math.PI * (angle + segmentAngle - 90) / 180);

    const pathData = `M50,50 L${x1},${y1} A45,45 0 ${largeArcFlag},1 ${x2},${y2} z`;

    const textAngle = angle + segmentAngle / 2;
    const textX = 50 + 30 * Math.cos(Math.PI * (textAngle - 90) / 180);
    const textY = 50 + 30 * Math.sin(Math.PI * (textAngle - 90) / 180);

    const { value, color, labelColor } = segments[index];

    return (
        <g>
            <path d={pathData} fill={color} stroke="#00BFFF" strokeWidth="0.5" />
            <text
                x={textX}
                y={textY}
                dy=".3em"
                textAnchor="middle"
                fontSize="12"
                fontWeight="bold"
                fill={labelColor}
                transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                 style={{ filter: 'drop-shadow(0 0 2px #00E5FF)' }}
            >
                {value}
            </text>
        </g>
    );
};


export function SpinWheel({ onSpinEnd, userProfile, isSessionActive }: SpinWheelProps) {
    const router = useRouter();
    const { applySpinWinnings, startAdCooldown, adCooldownEndTime, canWatchAd } = useAuth();
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [cooldownTime, setCooldownTime] = useState('');
    const [inCooldown, setInCooldown] = useState(false);
    const [winnings, setWinnings] = useState<number | null>(null);
    const [winningsKey, setWinningsKey] = useState(0);
    const [showWinningsDialog, setShowWinningsDialog] = useState(false);
    const [rewardClaimed, setRewardClaimed] = useState(false);
    const [claimedAmount, setClaimedAmount] = useState(0);
    const [lastSpinResult, setLastSpinResult] = useState<number | null>(null);
    const [adCooldownRemaining, setAdCooldownRemaining] = useState(0);
    const [multiplier, setMultiplier] = useState(1.5);

    const winningValueRef = useRef<number | null>(null);

    const isAdmin = userProfile?.isAdmin === true || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
    const spinsUsed = userProfile?.spinCount || 0;
    const spinsRemaining = Math.max(0, 2 - spinsUsed);

    const formatTime = (ms: number) => {
        if (ms < 0) return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    useEffect(() => {
        if (isAdmin) {
          setInCooldown(false);
          return;
        }

        let interval: NodeJS.Timeout | undefined;

        if (userProfile?.spinCooldownEnd && Date.now() < userProfile.spinCooldownEnd) {
            setInCooldown(true);
            interval = setInterval(() => {
                const now = Date.now();
                const remainingMs = userProfile.spinCooldownEnd! - now;
                if (remainingMs > 0) {
                    setCooldownTime(formatTime(remainingMs));
                } else {
                    setCooldownTime('00:00:00');
                    setInCooldown(false);
                    clearInterval(interval);
                }
            }, 1000);
        } else {
            setInCooldown(false);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [userProfile, isAdmin]);

    // Self-healing effect for stuck users
    useEffect(() => {
        if (!isAdmin && spinsUsed >= 2 && !inCooldown && !userProfile?.spinCooldownEnd) {
            startAdCooldown();
        }
    }, [spinsUsed, inCooldown, isAdmin, userProfile?.spinCooldownEnd, startAdCooldown]);
    
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

    const handleSpinEnd = useCallback(async () => {
        window.dispatchEvent(new CustomEvent('spin-wheel-end'));
    
        const currentWinningValue = winningValueRef.current;
        setWinnings(currentWinningValue);
        setRewardClaimed(false);
        setClaimedAmount(0);
        if (spinsUsed === 0) {
            setLastSpinResult(currentWinningValue);
        }
        setShowWinningsDialog(true);
    }, [spinsUsed]);

    const handleSpin = () => {
        if (!userProfile) {
            router.push('/login');
            return;
        }
        
        const spinLimitReached = !isAdmin && spinsUsed >= 2;

        if (isSpinning || (!isAdmin && inCooldown) || spinLimitReached) {
            return;
        }
        
        window.dispatchEvent(new CustomEvent('spin-wheel-start'));
        
        setIsSpinning(true);
        setWinnings(null);
        
        const wv = getWeightedRandomSegmentValue(spinsUsed === 1 ? lastSpinResult : null);
        winningValueRef.current = wv;
        const randomMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
        setMultiplier(randomMultiplier);
        
        const winningSegment = segments.find(s => s.value === wv);
        const winningSegmentIndex = winningSegment ? segments.indexOf(winningSegment) : 0;

        const fullSpins = 10;
        const finalAngle = -(winningSegmentIndex * segmentAngle);
        const newRotation = (rotation - (rotation % 360)) + (fullSpins * 360) + finalAngle;

        setRotation(newRotation);
    };
    
    const handleCloseDialog = () => {
        setShowWinningsDialog(false);
    };

    const handleClaimBaseReward = async () => {
      if (winnings === null || rewardClaimed) return;
      await applySpinWinnings(winnings, false);
      setRewardClaimed(true);
      setClaimedAmount(winnings);
    };

    const handleWatchAd = async () => {
        if (winnings === null || rewardClaimed) return;

        // Trigger the native ad if available, otherwise simulate
        if (typeof window !== 'undefined' && window.Android && typeof window.Android.showRewardedAd === "function") {
            window.Android.showRewardedAd();
        } else {
            console.log("Simulating ad watch in this environment.");
        }

        const finalWinnings = winnings * multiplier;
        
        // Handle crediting the user in the background
        await applySpinWinnings(finalWinnings, true);
        
        // Update UI to show confirmation
        setRewardClaimed(true);
        setClaimedAmount(finalWinnings);
    };

    const handleCloseConfirmation = () => {
        handleCloseDialog();
        setIsSpinning(false);
        // Start the ad cooldown only after the confirmation is closed
        startAdCooldown();
    };
    
    const isButtonDisabled = isSpinning || (!isAdmin && (inCooldown || spinsUsed >= 2)) || !isSessionActive;

    const wheelStyle: React.CSSProperties = {
        transform: `rotate(${rotation}deg)`,
        transition: isSpinning ? 'transform 8s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
    };
    
    return (
        <div 
            className="flex flex-col items-center justify-start gap-4 sm:gap-8"
        >
            <h2 className="text-2xl sm:text-3xl font-bold text-cyan-300 tracking-widest" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'}}>
                SPIN THE WHEEL!
            </h2>
            
            {!isSessionActive && (
              <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Mining Session Inactive</AlertTitle>
                <AlertDescription>
                  You must start a mining session on the dashboard to spin the wheel.
                </AlertDescription>
              </Alert>
            )}

             <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center -ml-2 sm:ml-0">
                {winnings !== null && winnings > 0 && <WinningsAnimation key={winningsKey} amount={winnings} />}
                
                {/* Pointer */}
                 <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 z-20"
                    style={{
                        width: '0',
                        height: '0',
                        borderLeft: '15px solid transparent',
                        borderRight: '15px solid transparent',
                        borderTop: '30px solid #ff0055',
                        filter: 'drop-shadow(0 -2px 5px rgba(255, 0, 85, 0.8))',
                    }}
                ></div>

                {/* SVG Wheel Wrapper */}
                <div className="absolute inset-0" onTransitionEnd={handleSpinEnd} style={wheelStyle}>
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                            <radialGradient id="bulge" cx="50%" cy="50%" r="50%">
                                <stop offset="85%" stopColor="#4A90E2" />
                                <stop offset="100%" stopColor="#003366" />
                            </radialGradient>
                            <filter id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur"/>
                                <feMerge>
                                    <feMergeNode in="blur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        
                        {/* Static Outer Circle */}
                        <circle cx="50" cy="50" r="50" fill="url(#bulge)" stroke="#7FDBFF" strokeWidth="0.5" filter="url(#outerGlow)" />

                        {/* Spinning Inner Segments */}
                        <g>
                             <g transform={`rotate(${-segmentAngle / 2} 50 50)`}>
                                {segments.map((_, index) => (
                                    <WheelSegment key={index} index={index} />
                                ))}
                            </g>
                        </g>
                    </svg>
                </div>


                {/* Center Button */}
                <div className="absolute z-10 rounded-full h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center"
                     style={{
                         background: 'radial-gradient(circle, #00FFFF, #008B8B)',
                         boxShadow: '0 0 20px rgba(0, 255, 255, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.5)'
                     }}
                >
                    {inCooldown && !isAdmin ? (
                        <div className="text-slate-900 font-bold text-base text-center leading-tight px-2">
                            <span className="text-xs font-normal block">Next spin in</span>
                            {cooldownTime}
                        </div>
                    ) : (
                        <Button 
                            onClick={handleSpin} 
                            disabled={isButtonDisabled} 
                            className="w-full h-full rounded-full bg-transparent hover:bg-cyan-400/20 text-white font-bold text-xl sm:text-2xl p-0 tracking-widest"
                            style={{ textShadow: '0 0 5px rgba(0,0,0,0.5)' }}
                        >
                            {isSpinning ? <Loader2 className="animate-spin h-8 w-8" /> : 'SPIN'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
                {userProfile && !isAdmin && !inCooldown && (
                    <div className="text-sm text-cyan-300/80">
                        {spinsRemaining > 0
                            ? `Spins remaining: ${spinsRemaining}`
                            : 'Spins will reset next session'
                        }
                    </div>
                )}
                {isAdmin && (
                    <div className="text-sm text-green-400 font-semibold">Admin: Unlimited Spins</div>
                )}
                 <Button onClick={() => router.back()} variant="outline" className="w-full bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white">
                    Close
                </Button>
            </div>

            <AlertDialog open={showWinningsDialog} onOpenChange={setShowWinningsDialog}>
                <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                   {rewardClaimed ? (
                        <>
                            <AlertDialogHeader className="text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4 border-2 border-green-500/50">
                                    <Check className="h-8 w-8 text-green-400" />
                                </div>
                                <AlertDialogTitle className="text-xl font-bold text-green-300">Reward Claimed!</AlertDialogTitle>
                                <AlertDialogDescription className="text-green-200/80">
                                    You've received {claimedAmount.toFixed(4)} BLIT coins! They have been added to your session earnings.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4">
                                <AlertDialogAction onClick={handleCloseConfirmation} className="w-full bg-green-500 text-white hover:bg-green-600">
                                    Awesome!
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    ) : (
                         <>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-2xl font-bold text-amber-300 text-center">🎉 Congratulations! 🎉</AlertDialogTitle>
                                <AlertDialogDescription className="text-center text-amber-200/80 pt-2">
                                You've won <span className="font-bold text-white">{(winnings || 0).toFixed(4)} coins</span>!
                                {canWatchAd && (
                                    <>
                                        {' '}Watch an ad to multiply your reward by <span className="font-bold text-white">x{multiplier}</span>.
                                    </>
                                )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-4 pt-4">
                                {canWatchAd && (
                                    <Button onClick={handleWatchAd} className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold shadow-lg border-b-4 border-amber-700 active:border-b-0" size="lg" disabled={adCooldownRemaining > 0}>
                                        <div className="flex items-center justify-center gap-2">
                                            <Clapperboard className="h-5 w-5" />
                                            <span>
                                                {adCooldownRemaining > 0
                                                ? `Next Ad in: ${Math.ceil(adCooldownRemaining / 1000)}s`
                                                : `Watch Ad for x${multiplier} Reward`}
                                            </span>
                                        </div>
                                    </Button>
                                )}
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={handleClaimBaseReward} className="w-full bg-slate-600 text-white hover:bg-slate-500">
                                    Claim {(winnings || 0).toFixed(4)} Coins
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

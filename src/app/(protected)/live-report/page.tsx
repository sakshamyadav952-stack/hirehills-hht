
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock, Coins, Zap, Gift, BarChart, Users } from 'lucide-react';
import type { ActiveBoost } from '@/lib/types';
import { cn } from '@/lib/utils';

function LiveBoostItem({ boost }: { boost: ActiveBoost }) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [earnings, setEarnings] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    const boostDurationHours = parseInt(boost.type.replace('H', ''));

    const updateValues = () => {
      const now = Date.now();
      const remainingMs = boost.endTime - now;
      
      if (remainingMs > 0) {
        setTimeRemaining(formatTime(remainingMs));
        const elapsedTimeMs = now - boost.startTime;
        const elapsedHours = elapsedTimeMs / (1000 * 60 * 60);
        setEarnings(boost.rate * elapsedHours);
      } else {
        if (!isComplete) {
            setTimeRemaining('00:00:00');
            setEarnings(boost.rate * boostDurationHours);
            setIsComplete(true);
        }
      }
    };

    updateValues();
    const interval = setInterval(updateValues, 1000);

    return () => clearInterval(interval);
  }, [boost, isComplete]);

  const boostColors = {
    '2H': 'from-green-500/20 to-green-500/5 border-green-500/30 text-green-300',
    '4H': 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-300',
    '8H': 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-300',
  };

  return (
    <li className={cn("flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r", boostColors[boost.type])}>
      <div className="flex items-center gap-4">
        <Gift className="h-7 w-7" />
        <div>
          <p className="font-semibold">
            {boost.type} Mystery Box
            {isComplete && <span className="ml-2 text-xs font-medium text-white/70">(Completed)</span>}
          </p>
          <p className="text-xs text-white/60">Rate: +{boost.rate.toFixed(4)} BLIT/hr</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-white">{earnings.toFixed(6)}</p>
        <p className="text-xs font-mono text-white/60">{timeRemaining}</p>
      </div>
    </li>
  );
}

export default function LiveReportPage() {
  const { userProfile, loading, miningRateBreakdown } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [baseEarnings, setBaseEarnings] = useState(0);
  const [boostEarnings, setBoostEarnings] = useState(0);
  
  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

  const formatTime = (ms: number) => {
    if (ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const elapsedTimeHours = useMemo(() => {
    if (isSessionActive && userProfile?.sessionEndTime && userProfile.miningStartTime) {
      const now = Date.now();
      const elapsedTimeSinceStartMs = now - userProfile.miningStartTime;
      return elapsedTimeSinceStartMs / (1000 * 60 * 60);
    } else if (userProfile?.sessionEndTime && userProfile.miningStartTime) {
      const sessionDurationMs = userProfile.sessionEndTime - userProfile.miningStartTime;
      return sessionDurationMs / (1000 * 60 * 60);
    }
    return 0;
  }, [isSessionActive, userProfile]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const updateLiveValues = () => {
      const now = Date.now();
      if (isSessionActive && userProfile?.sessionEndTime && userProfile.miningStartTime) {
        const remainingMs = userProfile.sessionEndTime - now;
        setTimeRemaining(formatTime(remainingMs));

        const baseRate = (miningRateBreakdown?.base || 0) + (miningRateBreakdown?.appliedCode || 0);
        setBaseEarnings(baseRate * elapsedTimeHours);

        let currentBoostEarnings = 0;
        (userProfile.activeBoosts || []).forEach(boost => {
          if (now > boost.startTime) {
            const effectiveEndTime = Math.min(now, boost.endTime);
            const elapsedBoostTimeMs = effectiveEndTime - boost.startTime;
            if (elapsedBoostTimeMs > 0) {
              const elapsedBoostTimeHours = elapsedBoostTimeMs / (1000 * 60 * 60);
              currentBoostEarnings += boost.rate * elapsedBoostTimeHours;
            }
          }
        });
        setBoostEarnings(currentBoostEarnings);

      } else {
        setTimeRemaining('00:00:00');
        setBaseEarnings(userProfile?.sessionBaseEarnings || 0);
        
        let finalBoostEarnings = 0;
        (userProfile?.activeBoosts || []).forEach(boost => {
            const boostDurationHours = parseInt(boost.type.replace('H', ''));
            finalBoostEarnings += boost.rate * boostDurationHours;
        });
        setBoostEarnings(finalBoostEarnings);
      }
    };
    
    updateLiveValues();
    if(isSessionActive) {
        interval = setInterval(updateLiveValues, 1000);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isSessionActive, userProfile, miningRateBreakdown, elapsedTimeHours]);

  const totalLiveEarnings = useMemo(() => {
    if (!userProfile) return 0;
    if (isSessionActive) {
      return baseEarnings + boostEarnings + (userProfile.spinWinnings || 0);
    }
    return userProfile.unclaimedCoins || 0;
  }, [isSessionActive, userProfile, baseEarnings, boostEarnings]);

  if (loading) {
    return (
        <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto bg-black/50 text-white border-slate-700 shadow-2xl shadow-primary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
             <BarChart className="h-6 w-6 text-primary" />
             <div>
                <CardTitle className="text-2xl text-primary">Live Mining Report</CardTitle>
                <CardDescription className="text-white/60">
                    A real-time overview of your current mining session.
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {(isSessionActive || (userProfile?.unclaimedCoins && userProfile.unclaimedCoins > 0)) ? (
                <div className="space-y-4">
                  {/* Base Earnings */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-4">
                      <Zap className="h-7 w-7 text-cyan-400" />
                      <div>
                        <p className="font-semibold text-cyan-300">Base Earnings</p>
                         <p className="text-xs text-white/60">
                            Rate: +{((miningRateBreakdown?.base || 0) + (miningRateBreakdown?.appliedCode || 0)).toFixed(4)} BLIT/hr
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">{baseEarnings.toFixed(6)}</p>
                      <p className="text-xs font-mono text-white/60">{timeRemaining}</p>
                    </div>
                  </div>

                  {/* Boosts */}
                  {userProfile?.activeBoosts?.map(boost => (
                    <LiveBoostItem key={boost.id} boost={boost} />
                  ))}

                  {/* Spin Winnings */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-4">
                      <Coins className="h-7 w-7 text-amber-400" />
                      <p className="font-semibold text-amber-300">Spin Wheel Earnings</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{(userProfile?.spinWinnings || 0).toFixed(4)}</p>
                  </div>
                  
                  {/* Total */}
                  <div className="flex flex-col items-center justify-center gap-4 py-8 mt-4 rounded-lg bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/30">
                        <p className="text-lg font-bold tracking-wider text-primary uppercase">TOTAL LIVE EARNINGS</p>
                        <div className="flex items-center gap-3">
                            <Coins className="h-10 w-10 text-amber-400" />
                            <p className="text-5xl font-bold text-white tracking-tighter" style={{textShadow: '0 0 15px rgba(251, 191, 36, 0.5)'}}>
                                {totalLiveEarnings.toFixed(4)}
                            </p>
                        </div>
                        <p className="text-base font-medium text-white/70">BLIT</p>
                  </div>
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg border-slate-700">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold text-white">No Active Session</h3>
                    <p className="text-sm text-muted-foreground">Start a mining session on the dashboard to see live data here.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

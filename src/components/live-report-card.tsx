

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { UserProfile, ActiveBoost } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Clock, Coins, Zap, Gift, BarChart, Clapperboard, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

function LiveBoostItem({ boost, isAdminView }: { boost: ActiveBoost, isAdminView: boolean }) {
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
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {boost.type} Mystery Box
            </p>
            {isAdminView && boost.adWatched && (
              <Clapperboard className="h-4 w-4 text-white" />
            )}
          </div>
          <p className="text-xs text-white/60">Rate: +{boost.rate.toFixed(4)} BLIT/hr {isComplete && <span className="ml-2 font-medium text-white/70">(Completed)</span>}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-white">{earnings.toFixed(6)}</p>
        <p className="text-xs font-mono text-white/60">{timeRemaining}</p>
      </div>
    </li>
  );
}

export function LiveReportCard({ userProfile, loading }: { userProfile: UserProfile | null, loading?: boolean }) {
  const { userProfile: adminProfile } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [baseEarnings, setBaseEarnings] = useState(0);
  const [liveCoins, setLiveCoins] = useState(0);
  
  const isAdminView = !!adminProfile?.isAdmin;

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
  
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
    
        const calculateLiveValues = () => {
        if (!userProfile) {
            setLiveCoins(0);
            return;
        }
        
        const now = Date.now();
        const baseRate = userProfile.baseMiningRate || 0.25;
        const referralBonus = (userProfile.referrals?.length || 0) * 0.1;
        
        if (userProfile.sessionEndTime && now < userProfile.sessionEndTime && userProfile.miningStartTime) {
            const sessionStartTime = userProfile.miningStartTime;
            const elapsedTimeSinceSessionStartMs = now - sessionStartTime;
            const elapsedTimeHours = elapsedTimeSinceSessionStartMs / (1000 * 60 * 60);

            let totalLiveEarnings = (baseRate + referralBonus) * elapsedTimeHours;
            
            (userProfile.activeBoosts || []).forEach(boost => {
            const boostStartTime = boost.startTime;
            const boostEndTime = boost.endTime;
            const boostRate = boost.rate;

            if (now > boostStartTime) {
                const effectiveEndTime = Math.min(now, boostEndTime);
                const elapsedBoostTimeMs = effectiveEndTime - boostStartTime;
                if (elapsedBoostTimeMs > 0) {
                const elapsedBoostTimeHours = elapsedBoostTimeMs / (1000 * 60 * 60);
                totalLiveEarnings += boostRate * elapsedBoostTimeHours;
                }
            }
            });
            
            totalLiveEarnings += userProfile.spinWinnings || 0;
            
            setLiveCoins(totalLiveEarnings);
        } else {
            setLiveCoins(userProfile.unclaimedCoins || 0);
        }
        };
    
        calculateLiveValues();
        interval = setInterval(calculateLiveValues, 1000);
    
        return () => {
        if (interval) clearInterval(interval);
        };
    }, [userProfile]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const updateLiveValues = () => {
      const now = Date.now();
      if (isSessionActive && userProfile?.sessionEndTime && userProfile.miningStartTime) {
        const remainingMs = userProfile.sessionEndTime - now;
        setTimeRemaining(formatTime(remainingMs));

        const baseRate = userProfile.baseMiningRate || 0.25;
        const referralBonus = (userProfile.referrals?.length || 0) * 0.1;
        const miningRatePerSecond = (baseRate + referralBonus) / 3600;
        const elapsedTimeSinceStartMs = now - userProfile.miningStartTime;
        const coinsEarnedFromBase = (elapsedTimeSinceStartMs / 1000) * miningRatePerSecond;
        setBaseEarnings(coinsEarnedFromBase);
      } else {
        setTimeRemaining('00:00:00');
        if (userProfile?.sessionEndTime && userProfile.miningStartTime) {
          const sessionDurationMs = userProfile.sessionEndTime - userProfile.miningStartTime;
          const sessionDurationHours = sessionDurationMs / (1000 * 60 * 60);
          const baseRate = userProfile.baseMiningRate || 0.25;
          const referralBonus = (userProfile.referrals?.length || 0) * 0.1;
          setBaseEarnings((baseRate + referralBonus) * sessionDurationHours);
        } else {
          setBaseEarnings(0);
        }
      }
    };
    
    updateLiveValues();
    interval = setInterval(updateLiveValues, 1000);

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isSessionActive, userProfile]);

  if (loading) {
    return (
        <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
      <Card className="max-w-2xl mx-auto bg-black/50 text-white border-slate-700 shadow-2xl shadow-primary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
             <BarChart className="h-6 w-6 text-primary" />
             <div>
                <CardTitle className="text-2xl text-primary">Live Mining Report</CardTitle>
                <CardDescription className="text-white/60">
                    A real-time overview of the user's current mining session.
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            {(isSessionActive || (userProfile?.unclaimedCoins && userProfile.unclaimedCoins > 0)) ? (
                <div className="space-y-4">
                  {/* Base Rate */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-4">
                      <Zap className="h-7 w-7 text-cyan-400" />
                      <div>
                        <p className="font-semibold text-cyan-300">Base & Referral Earnings</p>
                        <p className="text-xs text-white/60">Session Countdown</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">{baseEarnings.toFixed(6)}</p>
                      <p className="text-xs font-mono text-white/60">{timeRemaining}</p>
                    </div>
                  </div>

                  {/* Boosts */}
                  {userProfile?.activeBoosts?.map(boost => (
                    <LiveBoostItem key={boost.id} boost={boost} isAdminView={isAdminView} />
                  ))}

                  {/* Spin Winnings */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-800/50 border-slate-700">
                    <div className="flex items-center gap-4">
                      <Award className="h-7 w-7 text-amber-400" />
                      <div>
                        <p className="font-semibold text-amber-300">Spin Wheel Earnings</p>
                         {isAdminView && (userProfile?.spinAdWatchCount ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-white/60">
                                <Clapperboard className="h-3 w-3" />
                                <span>{userProfile?.spinAdWatchCount} ad(s) watched</span>
                            </div>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-white">{(userProfile?.spinWinnings || 0).toFixed(4)}</p>
                  </div>
                  
                  {/* Total */}
                  <div className="flex flex-col items-center justify-center gap-4 py-8 mt-4 rounded-lg bg-gradient-to-tr from-primary/20 to-primary/5 border border-primary/30">
                        <p className="text-lg font-bold tracking-wider text-primary uppercase">TOTAL LIVE EARNINGS</p>
                        <div className="flex items-center gap-3">
                            <Coins className="h-10 w-10 text-amber-400" />
                            <p className="text-5xl font-bold text-white tracking-tighter" style={{textShadow: '0 0 15px rgba(251, 191, 36, 0.5)'}}>
                                {isSessionActive ? liveCoins.toFixed(4) : (userProfile?.unclaimedCoins || 0).toFixed(4)}
                            </p>
                        </div>
                        <p className="text-base font-medium text-white/70">BLIT</p>
                  </div>
                </div>
            ) : (
                 <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg border-slate-700">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                    <h3 className="font-semibold text-white">No Active Session</h3>
                    <p className="text-sm text-muted-foreground">The user does not have an active mining session.</p>
                </div>
            )}
        </CardContent>
      </Card>
  );
}


"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { 
  Play, Loader2, Coins, ChevronDown, 
  Wallet, Zap, LayoutGrid, Clock, Cpu, 
  Database, Network, Activity, Clapperboard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, ResponsiveContainer, Tooltip 
} from "recharts";
import { format, addMinutes, differenceInSeconds } from "date-fns";

// Simulated Graph Data for visual flair
const generateChartData = () => {
  return Array.from({ length: 25 }, (_, i) => ({
    time: i,
    value: 1200 + Math.random() * 150,
  }));
};

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, getGlobalSessionDuration, totalMiningRate, dailyAdCoins, collectDailyAdCoin, claimMissedAdCoin, updateMiningRate } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [sessionProgress, setSessionProgress] = useState(0);
  const [chartData, setChartData] = useState(generateChartData());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [nextSlotCountdown, setNextSlotCountdown] = useState<string | null>(null);

  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

  // Calculate the next available slot for the countdown display
  useEffect(() => {
    const updateNextSlot = () => {
        const now = new Date();
        const schedule = ['08:00', '12:00', '16:00', '22:00'];
        let next: Date | null = null;

        for (const timeStr of schedule) {
            const [h, m] = timeStr.split(':').map(Number);
            const slot = new Date(now);
            slot.setHours(h, m, 0, 0);
            if (slot > now) {
                next = slot;
                break;
            }
        }

        if (!next) {
            next = new Date(now);
            next.setDate(next.getDate() + 1);
            next.setHours(8, 0, 0, 0);
        }

        const diff = differenceInSeconds(next, now);
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        setNextSlotCountdown(`${hours}h ${mins}m`);
    };

    updateNextSlot();
    const interval = setInterval(updateNextSlot, 60000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Chart Update
  useEffect(() => {
    if (isSessionActive) {
      const interval = setInterval(() => {
        setChartData(prev => [...prev.slice(1), { 
          time: prev[prev.length - 1].time + 1, 
          value: 1200 + Math.random() * 150 
        }]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isSessionActive]);

  // Timer & Progress Update
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && userProfile?.sessionEndTime && userProfile?.miningStartTime) {
      const updateMetrics = () => {
        const now = Date.now();
        const diff = userProfile.sessionEndTime! - now;
        
        if (diff <= 0) {
          setTimeRemaining('00:00:00');
          setSessionProgress(100);
          return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

        const total = userProfile.sessionEndTime! - userProfile.miningStartTime!;
        const elapsed = now - userProfile.miningStartTime!;
        const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        setSessionProgress(progress);
      };
      updateMetrics();
      interval = setInterval(updateMetrics, 1000);
    } else {
      setSessionProgress(0);
      setTimeRemaining('08:00:00');
    }
    return () => clearInterval(interval);
  }, [isSessionActive, userProfile?.sessionEndTime, userProfile?.miningStartTime]);

  const handleStartMining = async () => {
    if (isSessionActive || isStarting) return;
    setIsStarting(true);
    try {
      const duration = await getGlobalSessionDuration();
      const now = Date.now();
      await updateMiningState(now, now + duration * 60000);
    } finally {
      setIsStarting(false);
    }
  };

  const handleDailyClaim = async () => {
    if (!dailyAdCoins.length || isProcessing) return;
    
    // Sort coins: available ones first, then missed (recovery)
    const available = dailyAdCoins.find(c => c.status === 'available');
    const missed = dailyAdCoins.sort((a, b) => b.availableAt - a.availableAt).find(c => c.status === 'missed');
    
    const target = available || missed;
    if (!target) return;

    setIsProcessing('daily');
    try {
        if (target.status === 'available') {
            await collectDailyAdCoin(target.id);
        } else {
            await claimMissedAdCoin(target.id, `Recovery: ${target.id}`);
        }
    } finally {
        setIsProcessing(null);
    }
  };

  const handleTurboBoost = async () => {
    if (!userProfile || isProcessing || !isSessionActive) return;
    
    const boostCount = (userProfile.activeBoosts || []).filter(
        b => b.startTime >= userProfile.miningStartTime!
    ).length;

    if (boostCount >= 10) return; // Limit 10 boosts per session

    setIsProcessing('turbo');
    try {
      if (typeof window !== 'undefined' && window.Android?.showRewardedAd) {
        window.Android.showRewardedAd();
      }
      
      // Apply an 8-hour 0.10 HOT/hr boost
      await updateMiningRate('8H', 0.10, true);
    } finally {
      setIsProcessing(null);
    }
  };

  const currentTaskCoin = useMemo(() => {
      const available = dailyAdCoins.find(c => c.status === 'available');
      if (available) return available;
      return dailyAdCoins.sort((a, b) => b.availableAt - a.availableAt).find(c => c.status === 'missed');
  }, [dailyAdCoins]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-6 pb-20">
      {/* High-Fidelity Branding Header */}
      <div className="relative min-h-[450px] w-full rounded-[2.5rem] overflow-hidden glass-card border-white/5 bg-zinc-900/40 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-cyan-600/5" />
        
        {/* Header Icons */}
        <div className="absolute top-8 left-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <LayoutGrid className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl leading-none tracking-tight">HIREHILLS</h1>
            <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">CORE NODE v4.0</p>
          </div>
        </div>

        <Link href="/wallet" className="absolute top-8 right-8 transition-transform hover:scale-110 active:scale-95 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-white/10">
            <Wallet className="text-white h-6 w-6" />
          </div>
        </Link>

        {/* HERO CONTENT: ACCUMULATION OR START BUTTON */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6 flex flex-col items-center">
          {isSessionActive ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-500 w-full">
              <span className="text-cyan-400/40 text-[10px] font-black uppercase tracking-[0.5em] mb-3">Live Accumulation</span>
              <div className="relative">
                <h2 className="text-white text-5xl md:text-7xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  {liveCoins.toFixed(4)}
                </h2>
                <div className="absolute inset-0 border-y border-white/5 animate-scan-line pointer-events-none" />
              </div>
              
              <div className="flex items-center gap-3 mt-4 bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                <span className="text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase italic">Processing HOT</span>
              </div>

              {/* Progress & Time */}
              <div className="mt-8 w-full max-w-[280px] space-y-4">
                <div className="relative">
                  <Progress value={sessionProgress} className="h-2 bg-white/10 overflow-hidden" />
                  <div 
                    className="absolute inset-0 h-2 bg-gradient-to-r from-purple-600 to-cyan-400 blur-sm opacity-50 transition-all duration-1000" 
                    style={{ width: `${sessionProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">
                  <Clock className="h-3 w-3" />
                  <span>{timeRemaining} Remaining</span>
                </div>

                {/* Integrated Task Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={handleDailyClaim}
                    disabled={isProcessing === 'daily' || !currentTaskCoin}
                    className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex flex-col items-center justify-center gap-1 group disabled:opacity-50"
                  >
                    {isProcessing === 'daily' ? <Loader2 className="animate-spin h-4 w-4" /> : (
                      <>
                        {currentTaskCoin ? (
                            <>
                                {currentTaskCoin.status === 'available' ? (
                                    <Coins className="h-4 w-4 text-green-400 group-hover:scale-110 transition-transform" />
                                ) : (
                                    <Clapperboard className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="text-[9px] font-black uppercase">
                                    {currentTaskCoin.status === 'available' ? 'Free Claim' : 'Recovery'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Clock className="h-4 w-4 text-white/20" />
                                <span className="text-[8px] font-black uppercase text-white/20">{nextSlotCountdown}</span>
                            </>
                        )}
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleTurboBoost}
                    disabled={isProcessing === 'turbo'}
                    className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex flex-col items-center justify-center gap-1 group disabled:opacity-50"
                  >
                    {isProcessing === 'turbo' ? <Loader2 className="animate-spin h-4 w-4" /> : (
                      <>
                        <Zap className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                        <span className="text-[9px] font-black uppercase">Turbo Boost</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in duration-700 w-full max-w-sm">
              <span className="hot-logo-text text-8xl md:text-9xl opacity-20 mb-8">HOT</span>
              <Button 
                onClick={handleStartMining}
                disabled={isStarting}
                className="w-full h-20 rounded-3xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xl uppercase tracking-tighter shadow-[0_15px_40px_rgba(168,85,247,0.4)] active:scale-95 transition-all border-b-4 border-purple-800 active:border-b-0"
              >
                {isStarting ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Play className="mr-3 h-6 w-6 fill-current" />}
                Initialize Mining
              </Button>
              <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] mt-6 uppercase">System Standby: Click to Start</span>
            </div>
          )}
        </div>
      </div>

      {/* Secondary technical readouts */}
      <div className="glass-card rounded-[3rem] p-8 glow-border relative overflow-hidden bg-zinc-900/20">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://picsum.photos/seed/tech/800/800')] mix-blend-overlay" />

        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isSessionActive ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white font-black text-lg uppercase tracking-tighter">Computation Core</span>
            <ChevronDown className="h-5 w-5 text-white/20" />
          </div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/80 font-mono text-xs font-bold tracking-widest uppercase">
              {isSessionActive ? 'State: Running' : 'State: Ready'}
            </span>
          </div>
        </div>

        <div className="flex justify-end text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span>Pool: 200M HOT</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
          <div className="space-y-2">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Efficiency</p>
            <div className="flex items-baseline gap-4">
              <h2 className="text-white text-5xl font-black tracking-tighter italic">
                {isSessionActive ? totalMiningRate.toFixed(2) : "0.00"}
              </h2>
              <span className="text-cyan-400 font-black text-xl italic">HOT/HR</span>
            </div>
            {isSessionActive && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <Activity className="h-4 w-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Session Gain</span>
                  <span className="text-lg font-mono font-bold text-white tracking-tight">{liveCoins.toFixed(6)}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-24 w-full opacity-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isSessionActive ? "#a855f7" : "#333"} 
                  strokeWidth={3} 
                  dot={false}
                  isAnimationActive={false}
                />
                <Tooltip content={() => null} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hardware Stats Footer */}
      <div className="px-4 py-6 border-t border-white/5 flex justify-between items-center text-white/20">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Cpu className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Optimized_CPU</span>
            </div>
            <div className="flex items-center gap-2">
                <Network className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Hot_Net_Node</span>
            </div>
        </div>
        <span className="text-[9px] font-mono">v4.0.5-release</span>
      </div>
    </div>
  );
}

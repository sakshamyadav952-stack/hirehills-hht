
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { 
  Play, Loader2, Coins, ChevronDown, 
  Wallet, Zap, LayoutGrid, Clock, Cpu, 
  Database, Network, Activity, Clapperboard, X, Check, Rocket
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, ResponsiveContainer, Tooltip 
} from "recharts";
import { format, addMinutes, differenceInSeconds } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Simulated Graph Data for visual flair
const generateChartData = () => {
  return Array.from({ length: 25 }, (_, i) => ({
    time: i,
    value: 1200 + Math.random() * 150,
  }));
};

function DailyClaimDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { dailyAdCoins, collectDailyAdCoin, claimMissedAdCoin } = useAuth();
    const [isClaiming, setIsClaiming] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const handleClaim = async (coinId: string, status: 'available' | 'missed') => {
        setIsClaiming(coinId);
        try {
            if (status === 'available') {
                await collectDailyAdCoin(coinId);
                setShowSuccessDialog(true);
            } else {
                const result = await claimMissedAdCoin(coinId, `Recovery: ${coinId}`);
                if (result) {
                    setShowSuccessDialog(true);
                }
            }
        } finally {
            setIsClaiming(null);
        }
    };

    return (
        <>
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="text-white border-white/10 max-w-md w-[95%] rounded-3xl" style={{ background: 'linear-gradient(145deg, #0d0d1a, #1a1a2e)' }}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Coins className="text-amber-400 h-6 w-6" />
                        CLAIM COINS
                    </DialogTitle>
                    <DialogDescription className="text-white/40 text-xs font-bold uppercase tracking-widest">
                        Node Synchronization Tasks
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {dailyAdCoins.length === 0 ? (
                        <div className="text-center py-8 text-white/20">
                            <Check className="mx-auto h-12 w-12 mb-2 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">All current tasks completed</p>
                        </div>
                    ) : (
                        dailyAdCoins.map((coin) => (
                            <div key={coin.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md",
                                        coin.status === 'available' ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"
                                    )}>
                                        {coin.status === 'available' ? <Zap className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                                            Slot: {coin.id.split('-').pop()}
                                        </p>
                                        <p className="text-sm font-bold text-white uppercase">
                                            {coin.status === 'available' ? 'Live Bonus' : 'Missed Node'}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm"
                                    onClick={() => handleClaim(coin.id, coin.status)}
                                    disabled={!!isClaiming}
                                    className={cn(
                                        "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                        coin.status === 'available' 
                                            ? "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]" 
                                            : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                    )}
                                >
                                    {isClaiming === coin.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        coin.status === 'available' ? 'Claim Free' : 'Recover (Ad)'
                                    )}
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full text-white/40 font-bold uppercase tracking-widest text-[10px]">
                            Minimize Terminal
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <AlertDialogContent className="text-white border-green-400/50" style={{ background: 'linear-gradient(145deg, #0d1a0d, #162e16)' }}>
                <AlertDialogHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4 border-2 border-green-500/50">
                        <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-green-300">Synchronization Complete!</AlertDialogTitle>
                    <AlertDialogDescription className="text-green-200/80">
                        The HOT token from your node slot has been successfully synchronized and credited to your wallet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogAction onClick={() => setShowSuccessDialog(false)} className="w-full bg-green-500 text-white hover:bg-green-600 font-bold">
                        Continue Mining
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, getGlobalSessionDuration, totalMiningRate, dailyAdCoins, updateMiningRate } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [sessionProgress, setSessionProgress] = useState(0);
  const [chartData, setChartData] = useState(generateChartData());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [nextSlotCountdown, setNextSlotCountdown] = useState<string | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [showBoostSuccess, setShowBoostSuccess] = useState(false);

  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

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

  const handleTurboBoost = async () => {
    if (!userProfile || isProcessing || !isSessionActive) return;
    
    const boostCount = (userProfile.activeBoosts || []).filter(
        b => b.startTime >= userProfile.miningStartTime!
    ).length;

    if (boostCount >= 10) return; 

    setIsProcessing('turbo');
    try {
      if (typeof window !== 'undefined' && window.Android?.showRewardedAd) {
        window.Android.showRewardedAd();
      }
      
      await updateMiningRate('8H', 0.10, true);
      
      // Wait for 5 seconds as requested before showing confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));
      setShowBoostSuccess(true);
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
      <div className="relative min-h-[450px] w-full rounded-[2.5rem] overflow-hidden glass-card border-white/5 bg-zinc-900/40 transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-cyan-600/5" />
        
        <div className="absolute top-8 left-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <LayoutGrid className="text-white h-6 w-6" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl leading-none tracking-tight uppercase">HIREHILLS</h1>
            <p className="text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">CORE NODE v4.0</p>
          </div>
        </div>

        <Link href="/wallet" className="absolute top-8 right-8 transition-transform hover:scale-110 active:scale-95 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md hover:bg-white/10">
            <Wallet className="text-white h-6 w-6" />
          </div>
        </Link>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-6 flex flex-col items-center">
          {isSessionActive ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-500 w-full">
              <span className="text-cyan-400/40 text-[10px] font-black uppercase tracking-[0.5em] mb-3">Session Accumulation</span>
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

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => setIsClaimDialogOpen(true)}
                    className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex flex-col items-center justify-center gap-1 group disabled:opacity-50"
                  >
                    {currentTaskCoin ? (
                        <>
                            <Coins className={cn("h-4 w-4 group-hover:scale-110 transition-transform", currentTaskCoin.status === 'available' ? 'text-green-400' : 'text-amber-400')} />
                            <span className="text-[9px] font-black uppercase">
                                Claim Coins
                            </span>
                        </>
                    ) : (
                        <>
                            <Clock className="h-4 w-4 text-white/20" />
                            <span className="text-[8px] font-black uppercase text-white/20">{nextSlotCountdown}</span>
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
                Initialize Node
              </Button>
              <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] mt-6 uppercase text-center">System Standby: Authenticate to Start session</span>
            </div>
          )}
        </div>
      </div>

      <DailyClaimDialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen} />

      <AlertDialog open={showBoostSuccess} onOpenChange={setShowBoostSuccess}>
        <AlertDialogContent className="text-white border-purple-400/50" style={{ background: 'linear-gradient(145deg, #0d0d1a, #1a1a2e)' }}>
            <AlertDialogHeader className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/20 mb-4 border-2 border-purple-500/50">
                    <Rocket className="h-8 w-8 text-purple-400" />
                </div>
                <AlertDialogTitle className="text-xl font-bold text-purple-300">CORE TURBO ACTIVATED</AlertDialogTitle>
                <AlertDialogDescription className="text-purple-200/80">
                    Neural link established. Your node efficiency has been increased by <span className="text-white font-bold">+0.10 HOT/hr</span> for the remainder of this cycle.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogAction onClick={() => setShowBoostSuccess(false)} className="w-full bg-purple-600 text-white hover:bg-purple-500 font-bold uppercase tracking-widest text-xs h-12 rounded-2xl">
                    Acknowledge
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

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

const generateChartData = () => {
  return Array.from({ length: 25 }, (_, i) => ({
    time: i,
    value: 1200 + Math.random() * 150,
  }));
};

function RateBreakdownDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { miningRateBreakdown, totalMiningRate, userProfile } = useAuth();

    return (
        <Dialog open={open} onOpenChange={setIsRateBreakdownOpen}>
            <DialogContent className="bg-background border-border max-w-[280px] sm:max-w-xs w-[90%] rounded-3xl shadow-2xl p-4 sm:p-6" style={{ opacity: 1 }}>
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                        <Zap className="text-primary h-4 w-4 sm:h-5 sm:w-5" />
                        EFFICIENCY
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                        Node Throughput
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-secondary border border-border">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase">Core Base</span>
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-bold text-primary">+{miningRateBreakdown?.base.toFixed(2) || "0.25"}</span>
                    </div>

                    {miningRateBreakdown?.appliedCode && miningRateBreakdown.appliedCode > 0 && (
                        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-secondary border border-border">
                            <div className="flex items-center gap-2">
                                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase">Activation</span>
                            </div>
                            <span className="font-mono text-xs sm:text-sm font-bold text-green-500">+{miningRateBreakdown.appliedCode.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-secondary border border-border">
                        <div className="flex items-center gap-2">
                            <Network className="h-3.5 w-3.5 sm:h-4 w-4 text-cyan-500" />
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase">Network</span>
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-bold text-cyan-500">+{miningRateBreakdown?.referral.toFixed(2) || "0.00"}</span>
                    </div>

                    {miningRateBreakdown?.boost && miningRateBreakdown.boost > 0 && (
                        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-secondary border border-border animate-pulse">
                            <div className="flex items-center gap-2">
                                <Rocket className="h-3.5 w-3.5 sm:h-4 w-4 text-purple-500" />
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase">Overclock</span>
                            </div>
                            <span className="font-mono text-xs sm:text-sm font-bold text-purple-500">+{miningRateBreakdown.boost.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="pt-3 border-t border-border mt-1">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[9px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Yield</span>
                            <span className="text-lg sm:text-xl font-black text-foreground italic">
                                {(userProfile?.sessionEndTime && Date.now() < userProfile.sessionEndTime) ? totalMiningRate.toFixed(2) : "0.00"} HOT/H
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost" className="w-full text-muted-foreground font-bold uppercase tracking-widest text-[9px] h-8">
                            Minimize
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DailyClaimDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { dailyAdCoins, collectDailyAdCoin, claimMissedAdCoin } = useAuth();
    const [isClaiming, setIsClaiming] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const handleClaim = async (coinId: string, status: 'available' | 'missed') => {
        setIsClaiming(coinId);
        
        if (status === 'missed' && typeof window !== 'undefined' && window.Android?.showRewardedAd) {
            window.Android.showRewardedAd();
        }

        await new Promise(resolve => setTimeout(resolve, 10000));

        try {
            if (status === 'available') {
                await collectDailyAdCoin(coinId);
                setShowSuccessDialog(true);
            } else {
                const result = await claimMissedAdCoin(coinId, `Sync: ${coinId}`);
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
            <DialogContent className="bg-background border-border max-w-md w-[95%] rounded-3xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-foreground">
                        <Coins className="text-amber-400 h-5 w-5 sm:h-6 sm:w-6" />
                        CLAIM COINS
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                        Last 8 Node Sync Tasks
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2 sm:space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {dailyAdCoins.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/40">
                            <Check className="mx-auto h-10 w-10 sm:h-12 sm:w-12 mb-2 opacity-20" />
                            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest">All tasks completed</p>
                        </div>
                    ) : (
                        dailyAdCoins.map((coin) => (
                            <div key={coin.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-secondary border border-border group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className={cn(
                                        "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center",
                                        coin.status === 'available' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {coin.status === 'available' ? <Zap className="h-4 w-4 sm:h-5 sm:w-5" /> : <Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
                                    </div>
                                    <div>
                                        <p className="text-[8px] sm:text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                                            Slot: {coin.id.split('-').pop()}
                                        </p>
                                        <p className="text-xs sm:text-sm font-bold text-foreground uppercase">
                                            {coin.status === 'available' ? 'Live Node' : 'Missed Node'}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm"
                                    onClick={() => handleClaim(coin.id, coin.status)}
                                    disabled={!!isClaiming}
                                    className={cn(
                                        "h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
                                        coin.status === 'available' 
                                            ? "bg-green-500 hover:bg-green-400 text-black shadow-lg" 
                                            : "bg-muted hover:bg-accent text-foreground border border-border"
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
                        <Button variant="ghost" className="w-full text-muted-foreground font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                            Close Terminal
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
            <AlertDialogContent className="bg-background border-green-500/50 w-[90%] max-w-[320px] rounded-3xl">
                <AlertDialogHeader className="text-center">
                    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-500/20 mb-4 border-2 border-green-500/50">
                        <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    </div>
                    <AlertDialogTitle className="text-lg sm:text-xl font-bold text-foreground uppercase tracking-tighter">Sync Successful!</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground text-xs sm:text-sm">
                        The HOT token from your node slot has been successfully synchronized and credited to your wallet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogAction onClick={() => setShowSuccessDialog(false)} className="w-full bg-green-500 text-white hover:bg-green-600 font-black uppercase tracking-widest text-[10px] h-10 sm:h-12 rounded-2xl shadow-lg">
                        Accept Transmission
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, getGlobalSessionDuration, totalMiningRate, updateMiningRate } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [sessionProgress, setSessionProgress] = useState(0);
  const [chartData, setChartData] = useState(generateChartData());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  const [isRateBreakdownOpen, setIsRateBreakdownOpen] = useState(false);
  const [showBoostSuccess, setShowBoostSuccess] = useState(false);

  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

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
    
    setIsProcessing('turbo');
    try {
      if (typeof window !== 'undefined' && window.Android?.showRewardedAd) {
        window.Android.showRewardedAd();
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await updateMiningRate('8H', 0.10, true);
      setShowBoostSuccess(true);
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Persistent Dashboard Header */}
      <header className="px-4 py-3 sm:px-6 flex items-center justify-between border-b border-border/50 sticky top-0 z-30 bg-background/80 backdrop-blur-md">
        {/* Left: Branding */}
        <div className="flex items-center gap-2">
            <span className="text-foreground font-black text-[10px] uppercase tracking-widest">HIREHILLS</span>
        </div>
        
        {/* Right Cluster: Rate + Wallet */}
        <div className="flex items-center gap-3">
           <button 
                onClick={() => setIsRateBreakdownOpen(true)}
                className="transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-secondary border border-border shadow-sm hover:border-primary/50"
            >
                <Zap className="text-primary h-3 w-3" />
                <span className="text-[9px] font-black text-foreground uppercase tracking-widest">
                    {isSessionActive ? totalMiningRate.toFixed(2) : "0.00"} HOT/HR
                </span>
            </button>

            <Link href="/wallet" className="transition-transform hover:scale-110 active:scale-95">
                <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shadow-inner hover:bg-accent">
                    <Wallet className="text-primary h-4 w-4" />
                </div>
            </Link>
        </div>
      </header>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Hero Terminal Card */}
        <div className="relative min-h-[340px] xs:min-h-[380px] sm:min-h-[420px] w-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-border bg-card shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          
          {/* Main Content Area */}
          <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 xs:px-6 flex flex-col items-center">
            {isSessionActive ? (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-500 w-full max-w-md">
                <span className="text-primary/40 text-[7px] xs:text-[8px] sm:text-[10px] font-black uppercase tracking-[0.5em] mb-1 xs:mb-2 sm:mb-3">Live Session Counter</span>
                <div className="relative mb-4 xs:mb-6 sm:mb-8">
                  <h2 className="text-foreground text-4xl xs:text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter tabular-nums drop-shadow-sm text-center">
                    {liveCoins.toFixed(4)}
                  </h2>
                  <div className="absolute inset-0 border-y border-border/20 animate-scan-line pointer-events-none" />
                </div>
                
                <div className="flex items-center gap-2 xs:gap-3 sm:gap-4 bg-primary/10 px-5 py-2 xs:px-6 xs:py-2.5 sm:px-8 sm:py-3 rounded-full border border-primary/20 shadow-lg mb-4 xs:mb-6 sm:mb-8">
                  <div className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_currentColor]" />
                  <span className="text-primary text-xs xs:text-sm sm:text-lg font-black tracking-[0.3em] uppercase italic tabular-nums">{timeRemaining}</span>
                </div>

                <div className="w-full max-w-[240px] xs:max-w-[280px] sm:max-w-[320px] space-y-2.5 xs:space-y-3 sm:space-y-4">
                  <div className="space-y-1 xs:space-y-1.5 sm:space-y-2">
                      <div className="relative">
                          <Progress value={sessionProgress} className="h-1.5 xs:h-2 sm:h-2.5 bg-muted overflow-hidden rounded-full" />
                          <div 
                              className="absolute inset-0 h-1.5 xs:h-2 sm:h-2.5 bg-gradient-to-r from-primary to-accent blur-sm opacity-50 transition-all duration-1000" 
                              style={{ width: `${sessionProgress}%` }}
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                    <button 
                      onClick={() => setIsClaimDialogOpen(true)}
                      className="h-12 xs:h-14 sm:h-16 rounded-xl xs:rounded-2xl bg-secondary border border-border hover:bg-accent text-foreground flex flex-col items-center justify-center gap-0.5 xs:gap-1 group transition-all shadow-sm"
                    >
                      <Coins className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[7px] xs:text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Claim Coins</span>
                    </button>

                    <button 
                      onClick={handleTurboBoost}
                      disabled={!!isProcessing}
                      className="h-12 xs:h-14 sm:h-16 rounded-xl xs:rounded-2xl bg-secondary border border-border hover:bg-accent text-foreground flex flex-col items-center justify-center gap-0.5 xs:gap-1 group disabled:opacity-50 transition-all shadow-sm"
                    >
                      {isProcessing === 'turbo' ? (
                          <Loader2 className="animate-spin h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5" />
                      ) : (
                          <>
                              <Zap className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 text-primary group-hover:animate-pulse" />
                              <span className="text-[7px] xs:text-[8px] sm:text-[10px] font-black uppercase tracking-widest">Turbo Boost</span>
                          </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in fade-in duration-700 w-full max-w-sm">
                <div className="relative mb-6 xs:mb-8 sm:mb-12">
                  <span className="hot-logo-text text-7xl xs:text-8xl sm:text-9xl md:text-[10rem] opacity-10 select-none leading-none">HOT</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <Database className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-foreground/5" />
                  </div>
                </div>
                <Button 
                  onClick={handleStartMining}
                  disabled={isStarting}
                  className="w-full h-14 xs:h-16 sm:h-20 rounded-2xl xs:rounded-[1.5rem] sm:rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base xs:text-lg sm:text-xl uppercase tracking-tighter shadow-xl active:scale-95 transition-all border-b-4 border-primary/80 active:border-b-0"
                >
                  {isStarting ? <Loader2 className="animate-spin mr-2 h-4 w-4 xs:h-5 xs:w-5" /> : <Play className="mr-2 h-4 w-4 xs:h-5 xs:w-5 fill-current" />}
                  Initialize Node
                </Button>
                <p className="text-muted-foreground text-[7px] xs:text-[8px] sm:text-[9px] font-black tracking-[0.2em] sm:tracking-[0.4em] mt-4 xs:mt-6 sm:mt-8 uppercase text-center max-w-[160px] xs:max-w-[180px] sm:max-w-[200px] leading-relaxed">
                  Terminal standby: authenticate encryption to begin cycle
                </p>
              </div>
            )}
          </div>
        </div>

        <DailyClaimDialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen} />
        <RateBreakdownDialog open={isRateBreakdownOpen} onOpenChange={setIsRateBreakdownOpen} />

        <AlertDialog open={showBoostSuccess} onOpenChange={setShowBoostSuccess}>
          <AlertDialogContent className="bg-background border-primary/50 w-[90%] max-w-[320px] rounded-3xl">
              <AlertDialogHeader className="text-center">
                  <div className="mx-auto flex h-10 w-10 xs:h-12 xs:w-12 items-center justify-center rounded-full bg-primary/20 mb-4 border-2 border-primary/50">
                      <Rocket className="h-5 w-5 xs:h-6 xs:w-6 text-primary" />
                  </div>
                  <AlertDialogTitle className="text-base xs:text-lg sm:text-xl font-black text-primary uppercase italic leading-none">TURBO_ACTIVE</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-[10px] xs:text-xs sm:text-sm">
                      Neural link established. Node efficiency increased by <span className="text-foreground font-bold">+0.10 HOT/hr</span> for the current sequence.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                  <AlertDialogAction onClick={() => setShowBoostSuccess(false)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] h-10 sm:h-12 rounded-2xl shadow-lg">
                      Acknowledge
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Efficiency Panel */}
        <div 
          onClick={() => setIsRateBreakdownOpen(true)}
          className="rounded-2xl xs:rounded-[2rem] sm:rounded-[3rem] p-4 xs:p-6 sm:p-8 relative overflow-hidden bg-card border border-border cursor-pointer transition-all hover:bg-secondary/20 active:scale-[0.99] shadow-md"
        >
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('https://picsum.photos/seed/cyber/800/800')] mix-blend-overlay" />

          <div className="flex justify-between items-center mb-4 xs:mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-1 h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 rounded-full ${isSessionActive ? 'bg-primary animate-pulse shadow-[0_0_8px_currentColor]' : 'bg-destructive'}`} />
              <span className="text-foreground font-black text-sm xs:text-base sm:text-lg uppercase tracking-tighter italic">Computation_Core</span>
              <ChevronDown className="h-3 w-3 xs:h-4 xs:w-4 text-muted-foreground/20" />
            </div>
            <div className="px-2 py-0.5 xs:px-3 xs:py-1 rounded-full bg-secondary border border-border">
              <span className="text-foreground/80 font-mono text-[6px] xs:text-[8px] sm:text-[10px] font-bold tracking-widest uppercase">
                {isSessionActive ? 'RUNNING' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-6 sm:gap-8 items-end">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[8px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none">Protocol Efficiency</p>
              <div className="flex items-baseline gap-2 sm:gap-4">
                <h2 className="text-foreground text-3xl xs:text-4xl sm:text-5xl font-black tracking-tighter italic tabular-nums leading-none">
                  {isSessionActive ? totalMiningRate.toFixed(2) : "0.00"}
                </h2>
                <span className="text-primary font-black text-base xs:text-lg sm:text-xl italic tracking-tighter leading-none">HOT/HR</span>
              </div>
              {isSessionActive && (
                <div className="flex items-center gap-2 mt-2 xs:mt-3 sm:mt-4 pt-2 xs:pt-3 sm:pt-4 border-t border-border">
                  <Activity className="h-2.5 w-2.5 xs:h-3 w-3 xs:h-4 xs:w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-0.5 xs:mb-1">Current_Yield</span>
                    <span className="text-sm xs:text-base sm:text-lg font-mono font-bold text-foreground tracking-tight leading-none">{liveCoins.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-12 xs:h-16 sm:h-24 w-full opacity-80 md:block hidden">
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

        {/* Footer Meta */}
        <div className="px-2 xs:px-4 py-3 xs:py-4 sm:py-6 border-t border-border flex justify-between items-center text-muted-foreground/40">
          <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                  <Cpu className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-[6px] xs:text-[7px] sm:text-[9px] font-bold uppercase tracking-widest">Optimized_CPU</span>
              </div>
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
                  <Network className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-[6px] xs:text-[7px] sm:text-[9px] font-bold uppercase tracking-widest">Hills_Net</span>
              </div>
          </div>
          <span className="text-[6px] xs:text-[7px] sm:text-[9px] font-mono tracking-tighter opacity-50 uppercase text-responsive-base">v4.0.12_STABLE</span>
        </div>
      </div>
    </div>
  );
}

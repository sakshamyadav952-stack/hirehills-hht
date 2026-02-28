"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { 
  Play, Loader2, Coins, ChevronDown, 
  Settings, Zap, LayoutGrid, Clock, Cpu, 
  Database, Network, Activity
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, ResponsiveContainer, Tooltip 
} from "recharts";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, arrayUnion, increment } from "firebase/firestore";

// Simulated Graph Data for visual flair
const generateChartData = () => {
  return Array.from({ length: 25 }, (_, i) => ({
    time: i,
    value: 1200 + Math.random() * 150,
  }));
};

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, getGlobalSessionDuration, totalMiningRate, toast } = useAuth();
  const firestore = useFirestore();
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [sessionProgress, setSessionProgress] = useState(0);
  const [chartData, setChartData] = useState(generateChartData());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

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
        
        // Timer
        if (diff <= 0) {
          setTimeRemaining('00:00:00');
          setSessionProgress(100);
          return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

        // Progress Bar
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

  const handleClaimMissedCoin = async () => {
    if (!userProfile || isProcessing) return;
    setIsProcessing('daily');
    try {
      if (typeof window !== 'undefined' && window.Android?.showRewardedAd) {
        window.Android.showRewardedAd();
      }
      
      const userRef = doc(firestore, 'users', userProfile.id);
      await updateDoc(userRef, {
        minedCoins: increment(1),
        adWatchHistory: arrayUnion({
          id: Math.random().toString(36).substr(2, 9),
          element: 'Daily Bonus',
          timestamp: Date.now()
        })
      });
      toast({ title: "Bonus Applied", description: "1.00 HOT added to your balance." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenMysteryBox = async () => {
    if (!userProfile || isProcessing) return;
    setIsProcessing('mystery');
    try {
      if (typeof window !== 'undefined' && window.Android?.showRewardedAd) {
        window.Android.showRewardedAd();
      }

      const userRef = doc(firestore, 'users', userProfile.id);
      const newBoost = {
        id: Math.random().toString(36).substr(2, 9),
        type: '8H',
        rate: 0.1,
        startTime: Date.now(),
        endTime: Date.now() + (8 * 3600000),
        adWatched: true
      };

      await updateDoc(userRef, {
        activeBoosts: arrayUnion(newBoost),
        adWatchHistory: arrayUnion({
          id: newBoost.id,
          element: 'Mining Optimization',
          timestamp: Date.now()
        })
      });
      toast({ title: "Hardware Optimized", description: "+0.10 HOT/hr boost active." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 space-y-6 pb-20">
      {/* High-Fidelity Branding Header */}
      <div className="relative h-72 w-full rounded-[2.5rem] overflow-hidden glass-card border-white/5 bg-zinc-900/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-transparent to-cyan-600/5" />
        
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

        {/* PROMINENT LIVE COUNTER - HERO ELEMENT */}
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none text-center w-full px-4">
          {isSessionActive ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
              <span className="text-cyan-400/40 text-[10px] font-black uppercase tracking-[0.5em] mb-3">Live Accumulation</span>
              <div className="relative group">
                <h2 className="text-white text-5xl md:text-7xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                  {liveCoins.toFixed(4)}
                </h2>
                {/* Visual Flair: Pulsing scanning line */}
                <div className="absolute inset-0 border-y border-white/5 animate-scan-line pointer-events-none" />
              </div>
              <div className="flex items-center gap-3 mt-4 bg-cyan-500/10 px-4 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                <span className="text-cyan-400 text-[10px] font-black tracking-[0.3em] uppercase italic">Processing HOT</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="hot-logo-text text-8xl md:text-9xl opacity-20">HOT</span>
              <span className="text-white/30 text-[10px] font-bold tracking-[0.3em] -mt-2">SYSTEM STANDBY</span>
            </div>
          )}
        </div>

        <div className="absolute top-8 right-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <Settings className="text-white h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Primary Technical Dashboard */}
      <div className="glass-card rounded-[3rem] p-8 glow-border relative overflow-hidden bg-zinc-900/10">
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

        {/* Dynamic Progress Section */}
        <div className="relative mb-6">
          <Progress 
            value={sessionProgress} 
            className="h-3 bg-white/5 overflow-hidden" 
          />
          {isSessionActive && (
            <div 
              className="absolute inset-0 h-3 bg-gradient-to-r from-purple-600 via-cyan-400 to-purple-600 blur-md opacity-30 animate-pulse transition-all duration-1000" 
              style={{ width: `${sessionProgress}%` }}
            />
          )}
        </div>

        <div className="flex justify-between text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-10">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>Remaining: {isSessionActive ? timeRemaining : '08:00:00'}</span>
          </div>
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
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Active</span>
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

        {/* Start Mining Toggle */}
        {!isSessionActive && (
          <div className="mt-10 pt-10 border-t border-white/5">
            <Button 
              onClick={handleStartMining}
              disabled={isStarting}
              className="w-full h-16 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-lg uppercase tracking-tighter shadow-[0_10px_30px_rgba(168,85,247,0.3)] active:scale-95 transition-all"
            >
              {isStarting ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : <Play className="mr-3 h-5 w-5 fill-current" />}
              Initialize Mining Sequence
            </Button>
          </div>
        )}

        <div className="mt-10 pt-10 border-t border-white/5 grid grid-cols-2 gap-4">
          <button 
            onClick={handleClaimMissedCoin}
            disabled={!isSessionActive || isProcessing === 'daily'}
            className="h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex flex-col items-center justify-center gap-1 group disabled:opacity-50"
          >
            {isProcessing === 'daily' ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-black uppercase">Daily Claim</span>
                </div>
                <span className="text-[10px] text-white/40 font-bold tracking-wider">1.00 HOT Bonus</span>
              </>
            )}
          </button>

          <button 
            onClick={handleOpenMysteryBox}
            disabled={!isSessionActive || isProcessing === 'mystery'}
            className="h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white flex flex-col items-center justify-center gap-1 group disabled:opacity-50"
          >
            {isProcessing === 'mystery' ? <Loader2 className="animate-spin h-5 w-5" /> : (
              <>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                  <span className="text-xs font-black uppercase">Turbo Boost</span>
                </div>
                <span className="text-[10px] text-white/40 font-bold tracking-wider">+0.10 HOT/HR</span>
              </>
            )}
          </button>
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
        <span className="text-[9px] font-mono">v4.0.2-release</span>
      </div>
    </div>
  );
}

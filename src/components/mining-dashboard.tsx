"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { 
  Play, Loader2, Coins, ChevronDown, 
  Settings, Zap, Wallet, ArrowRight,
  LayoutGrid, Activity
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  LineChart, Line, ResponsiveContainer, YAxis, 
  CartesianGrid, Tooltip 
} from "recharts";

// Simulated Graph Data
const generateChartData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    value: 1200 + Math.random() * 100,
  }));
};

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, getGlobalSessionDuration } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');
  const [chartData, setChartData] = useState(generateChartData());

  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

  useEffect(() => {
    if (isSessionActive) {
      const interval = setInterval(() => {
        setChartData(prev => [...prev.slice(1), { 
          time: prev[prev.length - 1].time + 1, 
          value: 1200 + Math.random() * 100 
        }]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isSessionActive]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && userProfile?.sessionEndTime) {
      const updateTimer = () => {
        const diff = userProfile.sessionEndTime! - Date.now();
        if (diff <= 0) {
          setTimeRemaining('00:00:00');
          return;
        }
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, userProfile?.sessionEndTime]);

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

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="app-background p-4 sm:p-6 space-y-6 pb-24">
      {/* Design Header */}
      <div className="relative h-48 w-full rounded-3xl overflow-hidden glass-card border-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-transparent to-cyan-900/20" />
        <div className="absolute top-6 left-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="bg-white/5 border border-white/10 rounded-xl">
            <LayoutGrid className="text-white h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Hirehills</h1>
            <p className="text-white/60 text-xs font-medium">Official Token</p>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="hot-logo-text text-7xl">HOT</span>
        </div>
        <div className="absolute top-6 right-6">
          <Button variant="ghost" size="icon" className="bg-white/5 border border-white/10 rounded-xl">
            <Settings className="text-white h-5 w-5" />
          </Button>
        </div>
        {/* Bottom Reflector */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Mining Section */}
      <div className="glass-card rounded-[2.5rem] p-6 glow-border">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Mining</span>
            <ChevronDown className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-white/80 font-mono text-sm">$:2:500</span>
        </div>

        <div className="relative mb-4">
          <Progress value={isSessionActive ? 65 : 0} className="h-2 bg-white/5" />
          <div className="absolute inset-0 h-2 bg-gradient-to-r from-purple-500 to-cyan-400 blur-sm opacity-50" />
        </div>

        <div className="flex justify-between text-white/40 text-xs mb-8">
          <span>{isSessionActive ? timeRemaining : '08:00:00'}</span>
          <span>$3.500</span>
        </div>

        <div className="space-y-1">
          <p className="text-white/60 text-sm font-medium">Hash Rate</p>
          <div className="flex items-baseline justify-between">
            <h2 className="text-neon-cyan text-4xl font-bold tracking-tighter">1,234.56</h2>
            <div className="text-right">
              <span className="text-cyan-400/60 text-[10px] uppercase font-bold block">Hash Rate</span>
              <span className="text-neon-cyan text-2xl font-bold">117,576</span>
            </div>
          </div>
        </div>

        {/* Technical Graph Overlay */}
        <div className="h-32 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="stepAfter" 
                dataKey="value" 
                stroke="#06b6d4" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip content={() => null} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-white/40 italic">Hash Rate</span>
            <span className="text-white/80">213,96.079</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-neon-cyan italic">Hash Rate</span>
            <span className="text-white/80">201,26.000</span>
          </div>
        </div>
      </div>

      {/* Wallet Balance Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-white font-bold text-lg">Wallet Balance</h3>
          <ArrowRight className="h-5 w-5 text-white/40" />
        </div>

        {/* Holographic Balance Card */}
        <div className="relative p-8 rounded-[2.5rem] overflow-hidden border border-white/10 group">
          {/* Holographic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/tech/800/400')] opacity-10 mix-blend-overlay" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full" />
          
          <div className="relative flex items-center gap-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <span className="text-white font-black text-xs">HOT</span>
              </div>
              <div className="absolute inset-0 bg-white/20 blur-md rounded-full -z-10 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest">HOT</span>
              <h4 className="text-white text-4xl font-bold tracking-tighter">
                {(userProfile?.minedCoins || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
          </div>

          {/* Decorative UI elements */}
          <div className="absolute bottom-4 right-8 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-cyan-400/40" />
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Action Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
        {isSessionActive ? (
          <Button 
            className="w-full h-16 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-tighter shadow-xl shadow-cyan-500/20"
          >
            <Activity className="mr-2 h-5 w-5 animate-pulse" />
            Active Mining
          </Button>
        ) : (
          <Button 
            onClick={handleStartMining}
            disabled={isStarting}
            className="w-full h-16 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-tighter shadow-xl shadow-purple-500/20"
          >
            {isStarting ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 h-5 w-5" />}
            Start Mining Session
          </Button>
        )}
      </div>
    </div>
  );
}
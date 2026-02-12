'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { TournamentConfig, PrizeTier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, DollarSign } from 'lucide-react';

const Countdown = ({ expiryDate }: { expiryDate: Date | Timestamp }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const endDate = expiryDate instanceof Timestamp ? expiryDate.toDate() : expiryDate;
        const interval = setInterval(() => {
            const now = new Date();
            const difference = endDate.getTime() - now.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ days, hours, minutes, seconds });
                setIsExpired(false);
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                setIsExpired(true);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiryDate]);

    if (isExpired) {
        return <div className="text-red-400 font-bold text-sm">Ended</div>;
    }

    return (
        <div className="flex justify-center gap-1.5">
            <TimeUnit value={timeLeft.days} label="Days" />
            <TimeUnit value={timeLeft.hours} label="Hrs" />
            <TimeUnit value={timeLeft.minutes} label="Mins" />
            <TimeUnit value={timeLeft.seconds} label="Secs" />
        </div>
    );
};

const TimeUnit = ({ value, label }: { value: number; label: string; }) => (
    <div className="p-1 bg-black/20 rounded-md text-center min-w-[32px] border border-slate-700">
        <div className="font-mono font-bold text-slate-200 text-base">{String(value).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-400 uppercase leading-tight">{label}</div>
    </div>
);


export function TournamentCard() {
  const firestore = useFirestore();
  const [config, setConfig] = useState<TournamentConfig | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const configDocRef = doc(firestore, 'config', 'tournament');
    const unsubscribe = onSnapshot(configDocRef, (doc) => {
      if (doc.exists()) {
        setConfig({ id: doc.id, ...doc.data() } as TournamentConfig);
      } else {
        setConfig(null);
      }
    });
    return () => unsubscribe();
  }, [firestore]);

  if (!config) {
    return null;
  }

  const isEnded = config.endDate ? (config.endDate as Timestamp).toMillis() < Date.now() : false;

  return (
    <Card className="relative overflow-hidden border-2 border-indigo-500 bg-gradient-to-br from-indigo-900/50 via-slate-900 to-indigo-900/30 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
                <CardTitle className="text-base sm:text-lg font-bold text-indigo-300 tracking-wider flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                    {config.headline}
                </CardTitle>
                <CardDescription className="text-indigo-200/90 text-xs">
                    {isEnded ? "The tournament has ended. Check the results!" : config.tagline}
                </CardDescription>
            </div>
            {!isEnded && config.isActive && config.endDate && <Countdown expiryDate={config.endDate} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0 sm:p-4 sm:pt-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-center text-indigo-200">Prize Tiers (USDC)</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {config.prizeTiers?.map(tier => (
              <div key={tier.id} className="text-center p-1.5 px-2 bg-black/30 rounded-md border border-indigo-400/30">
                <p className="text-[10px] font-bold text-indigo-300">
                  {tier.startRank === tier.endRank ? `Rank ${tier.startRank}` : `Rank ${tier.startRank}-${tier.endRank}`}
                </p>
                <p className="text-xs font-semibold text-white flex items-center justify-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  {tier.prize}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg border-b-4 border-indigo-800 active:border-b-0 h-9">
          <Link href="/leaderboard">
            View Leaderboard <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

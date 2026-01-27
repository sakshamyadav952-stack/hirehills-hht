
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Gift, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { AirdropConfig } from '@/lib/types';


export function AirdropCard() {
  const { userProfile } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(0);
  const [airdropConfig, setAirdropConfig] = useState<AirdropConfig | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const configDocRef = doc(firestore, 'config', 'airdrop');
    const unsubscribe = onSnapshot(configDocRef, (doc) => {
        if (doc.exists()) {
            setAirdropConfig(doc.data() as AirdropConfig);
        } else {
            setAirdropConfig(null);
        }
    });
    return () => unsubscribe();
  }, [firestore]);
  

  useEffect(() => {
    if (!airdropConfig?.expiryDate) return;

    const airdropEndDate = (airdropConfig.expiryDate as Timestamp).toMillis();
    
    const calculateTimeLeft = () => {
        const now = Date.now();
        const remaining = Math.max(0, airdropEndDate - now);
        setTimeLeft(remaining);
    };
    
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [airdropConfig?.expiryDate]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  };

  if (!userProfile || !airdropConfig || !airdropConfig.isActive || timeLeft <= 0) {
    return null;
  }
  
  const airdropReferralsCount = userProfile?.airdropReferralsCount || 0;
  const referralsNeeded = Math.max(0, airdropConfig.referralLimit - airdropReferralsCount);

  if (referralsNeeded <= 0) {
      return null;
  }

  const { days, hours, minutes, seconds } = formatTime(timeLeft);

  return (
    <Card className="relative overflow-hidden border-2 border-purple-500 bg-gradient-to-br from-purple-900/50 via-slate-900 to-purple-900/30 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="flex-1">
                 <CardTitle className="text-base sm:text-lg font-bold text-purple-300 tracking-wider flex items-center gap-2">
                    <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                    {airdropConfig.headline || 'Referral Airdrop!'}
                </CardTitle>
                <CardDescription className="text-purple-200/90 text-xs">{airdropConfig.tagline || 'Don\'t miss this opportunity!'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                    <TimeUnit value={days} label="Days" />
                    <TimeUnit value={hours} label="Hrs" />
                    <TimeUnit value={minutes} label="Mins" />
                    <TimeUnit value={seconds} label="Secs" />
                </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-3 pt-0 sm:p-4 sm:pt-2">
        <div className="text-center bg-black/40 p-3 rounded-lg border border-purple-400/20 relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-transparent opacity-50"></div>
           <p className="font-semibold text-sm relative z-10">
             You and your friend both get <span className="text-purple-300 font-bold">{airdropConfig.rewardAmount} BLIT</span> for each successful referral!
           </p>
          <p className="text-xs text-muted-foreground mt-1 relative z-10">You have <span className="font-bold text-white">{referralsNeeded}</span> referral rewards left in this event.</p>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Approve your friend's request from the "Security Circle" section to receive your reward.
        </p>

        <Button onClick={() => router.push('/airdrop')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg border-b-4 border-purple-800 active:border-b-0 h-9">
          View Airdrop Details <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

const TimeUnit = ({ value, label }: { value: number, label: string }) => (
    <div className="p-1 sm:p-1.5 bg-black/20 rounded-md text-center min-w-[32px] sm:min-w-[40px]">
        <div className="text-base sm:text-lg font-mono font-bold text-purple-300">{String(value).padStart(2, '0')}</div>
        <div className="text-[9px] sm:text-[10px] text-purple-300/70 leading-tight -mt-0.5">{label}</div>
    </div>
);

    
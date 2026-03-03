'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Gift, UserPlus, Star, Loader2, Check, X } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import type { AirdropConfig } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { Progress } from '@/components/ui/progress';

const Countdown = ({ expiryDate, size = 'normal' }: { expiryDate: Date | Timestamp, size?: 'normal' | 'small' }) => {
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
    return <div className="text-red-400 font-bold">Expired</div>;
  }

  return (
    <div className="flex justify-center gap-2">
      <TimeUnit value={timeLeft.days} label="Days" size={size} />
      <TimeUnit value={timeLeft.hours} label="Hours" size={size} />
      <TimeUnit value={timeLeft.minutes} label="Mins" size={size} />
      <TimeUnit value={timeLeft.seconds} label="Secs" size={size} />
    </div>
  );
};

const TimeUnit = ({ value, label, size }: { value: number; label: string; size: 'normal' | 'small' }) => (
  <div className={`p-2 bg-background border border-border rounded-lg text-center ${size === 'normal' ? 'min-w-[70px]' : 'min-w-[50px]'}`}>
    <div className={`font-mono font-bold text-foreground ${size === 'normal' ? 'text-4xl' : 'text-2xl'}`}>
      {String(value).padStart(2, '0')}
    </div>
    <div className="text-xs text-muted-foreground uppercase tracking-widest">
      {label}
    </div>
  </div>
);


export default function AirdropPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { userProfile } = useAuth();
  const [airdropConfig, setAirdropConfig] = useState<AirdropConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const configDocRef = doc(firestore, 'config', 'airdrop');
    const unsubscribe = onSnapshot(configDocRef, (doc) => {
        if (doc.exists()) {
            setAirdropConfig(doc.data() as AirdropConfig);
        } else {
            setAirdropConfig(null);
        }
        setIsLoading(false);
    });
    return () => unsubscribe();
}, [firestore]);


  if (isLoading || !airdropConfig || !userProfile) {
    return (
        <div className="flex h-screen items-center justify-center app-background">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  const airdropReferralCount = userProfile.airdropReferralsCount || 0;
  const isAirdropCompleted = userProfile.airdropCompletionBonusClaimed === true;
  const mainProgress = isAirdropCompleted ? 100 : (airdropReferralCount / airdropConfig.referralLimit) * 100;
  
  const isBonusCompleted = userProfile.airdropBonusClaimed === true;
  const isBonusDeadlinePassed = airdropConfig.bonusDeadline ? new Date() > (airdropConfig.bonusDeadline as Timestamp).toDate() : true;
  const bonusProgress = isBonusCompleted ? 100 : (airdropConfig.bonusReferralTarget ? (airdropReferralCount / airdropConfig.bonusReferralTarget) * 100 : 0);

  return (
    <div className="flex flex-col min-h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Referral Airdrop</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle>Your Airdrop Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Progress value={mainProgress} className="w-full" />
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">
                        {airdropReferralCount} / {airdropConfig.referralLimit} Referrals
                    </span>
                    {isAirdropCompleted ? (
                        <span className="text-green-500 font-bold flex items-center gap-1"><Check className="h-4 w-4" /> Completed!</span>
                    ) : (
                        <span className="text-foreground">
                            Completion Bonus: {airdropConfig.completionBonus} HOT
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
                <div className="inline-block p-3 mb-2 bg-primary/10 border-2 border-primary/20 rounded-full shadow-lg">
                    <Gift className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{airdropConfig?.headline || 'Referral Airdrop!'}</h1>
                <p className="text-muted-foreground max-w-md">{airdropConfig?.tagline || 'This is a limited-time opportunity to earn massive rewards.'}</p>
            </div>
            
            {airdropConfig.expiryDate && (
              <div className="space-y-2">
                <h3 className="text-center text-lg font-semibold text-foreground/90">Airdrop Ends In:</h3>
                <Countdown expiryDate={airdropConfig.expiryDate} size="normal" />
              </div>
            )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground"><UserPlus className="h-5 w-5"/> How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">1</div>
                        <p className="text-foreground/80">Invite friends using your unique referral code.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">2</div>
                        <p className="text-foreground/80">When they apply your code, the referral is instant. Rewards are granted and a request is sent to your Security Circle.</p>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">3</div>
                        <p className="text-foreground/80">Approve their node in your Security Circle to get the mining boost.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground"><Star className="h-5 w-5"/> Airdrop Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <p className="font-semibold text-foreground">Main Task:</p>
                        <p className="text-foreground/80">For each of your <span className="font-bold">first {airdropConfig?.referralLimit || 5} successful referrals</span> during the airdrop period, you and your friend both receive <span className="font-bold">{airdropConfig?.rewardAmount || 30} HOT</span> tokens.</p>
                        <p className="mt-2 text-foreground/80">After successfully completing the main task, you will receive an extra <span className="font-bold">{airdropConfig.completionBonus} HOT</span> as a completion bonus!</p>
                     </div>
                    {airdropConfig.bonusDeadline && airdropConfig.bonusReferralTarget && airdropConfig.bonusReferralTarget > 0 && (
                        <div className="pt-4 border-t border-border">
                            <p className="font-semibold text-foreground">Sub-Task Bonus:</p>
                            <p className="text-foreground/80">Complete <span className="font-bold">{airdropConfig.bonusReferralTarget} referrals</span> before the deadline to get an extra <span className="font-bold">{airdropConfig.bonusReward} HOT</span> bonus!</p>
                            
                             <div className="my-2 space-y-1">
                                <Progress value={bonusProgress} className="w-full h-2" />
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-muted-foreground">
                                        {airdropReferralCount} / {airdropConfig.bonusReferralTarget} Referrals
                                    </span>
                                     {isBonusCompleted ? (
                                        <span className="text-green-500 font-bold flex items-center gap-1"><Check className="h-4 w-4" /> Completed!</span>
                                    ) : isBonusDeadlinePassed ? (
                                        <span className="text-destructive font-bold flex items-center gap-1"><X className="h-4 w-4" /> Expired</span>
                                    ) : null}
                                </div>
                            </div>
                            
                            {airdropConfig.bonusDeadline && !isBonusCompleted && !isBonusDeadlinePassed && (
                                <div className="mt-2">
                                    <p className="text-center text-xs text-muted-foreground">Bonus Deadline In:</p>
                                    <Countdown expiryDate={airdropConfig.bonusDeadline} size="small" />
                                </div>
                            )}
                        </div>
                     )}
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">After the first {airdropConfig?.referralLimit || 5}, standard referral rewards will apply (10 HOT tokens each).</p>
                </CardContent>
            </Card>
        </div>


        <Button onClick={() => router.push('/invite')} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg border-b-4 border-primary/80 active:border-b-0 h-14 rounded-2xl" size="lg">
          Start Inviting Friends
        </Button>
        <div className="h-20 md:hidden" />
      </main>
    </div>
  );
}


'use client';

import { ReferralList } from '@/components/referral-list';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { NetworkStrengthIndicator } from '@/components/network-strength-indicator';
import { Card, CardContent } from '@/components/ui/card';

export default function ReferralsPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const referralCount = userProfile?.referrals?.length || 0;
  const referralsNeeded = 5 - referralCount;

  return (
    <div className="flex flex-col h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-amber-400/20">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Security Circle</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-cyan-400/10 border-2 border-cyan-400/20 mb-4 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                <ShieldCheck className="h-10 w-10 text-cyan-300" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Your Security Circle</h1>
            <p className="text-cyan-200/70 mt-2">View the friends you have successfully referred.</p>
        </div>
        
        <NetworkStrengthIndicator referralCount={referralCount} showDetailedDescription={false} />

        <div className="mt-6">
          <ReferralList />
        </div>
        
        {referralsNeeded > 0 && (
          <Card className="futuristic-card-bg-secondary text-center">
            <CardContent className="p-6">
                <p className="font-semibold text-amber-200">
                  Refer {referralsNeeded} more friend{referralsNeeded > 1 ? 's' : ''} to build a 'Strong' network.
                </p>
                <p className="text-sm text-amber-300/70 mt-1">
                    Users with a strong network get priority access to new features like KYC verification slots.
                </p>
            </CardContent>
          </Card>
        )}

        <div className="h-20 md:hidden" />
      </main>
    </div>
  );
}

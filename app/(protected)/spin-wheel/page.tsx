
'use client';

import { SpinWheel } from '@/components/spin-wheel';
import { useAuth } from '@/lib/auth';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award } from 'lucide-react';

export default function SpinWheelPage() {
  const { userProfile, creditSpinWinnings } = useAuth();
  const router = useRouter();
  
  const isSessionActive = useMemo(() => {
    if (!userProfile?.sessionEndTime) return false;
    return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

  const handleSpinEnd = async (winnings: number) => {
    if (!userProfile) return;
    await creditSpinWinnings(winnings);
  };

  return (
    <div className="flex flex-col h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-amber-400/20">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-300" />
            Spin Wheel
        </h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 grid place-items-center p-4 overflow-hidden">
         <SpinWheel 
            onSpinEnd={handleSpinEnd} 
            userProfile={userProfile} 
            isSessionActive={isSessionActive}
        />
      </main>
    </div>
  );
}

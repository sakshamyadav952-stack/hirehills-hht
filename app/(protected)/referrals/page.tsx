'use client';

import { ReferralList } from '@/components/referral-list';
import { useAuth } from '@/lib/auth';
import { ArrowLeft, Shield, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ReferralsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-[#000814] text-white">
      {/* Background decoration */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,180,216,0.1),transparent_50%)] pointer-events-none" />
      
      <header className="sticky top-0 z-30 flex items-center p-4 bg-transparent backdrop-blur-md">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="text-white hover:bg-white/10 rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1 flex justify-center pr-10">
            <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
                <Shield className="relative h-14 w-14 text-[#00B4D8] fill-[#00B4D8]/10 drop-shadow-[0_0_10px_rgba(0,180,216,0.5)]" />
                <Check className="absolute h-7 w-7 text-white stroke-[4px]" />
            </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 overflow-y-auto px-4 sm:px-8 pb-24 flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                My Security Circle
            </h1>
            <p className="text-[#90E0EF] text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] opacity-70">
                Trusted Users in Your Security Circle
            </p>
        </div>

        <div className="w-full max-w-xl">
          <ReferralList />
        </div>
        
        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest max-w-xs text-center leading-relaxed">
            Every active node in your circle increases global stability and your mining throughput.
        </p>
      </main>
    </div>
  );
}

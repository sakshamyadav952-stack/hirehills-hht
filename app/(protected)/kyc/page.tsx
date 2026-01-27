
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Fingerprint, Clock } from 'lucide-react';

export default function KycPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-amber-400/20">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">KYC Verification</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Card className="w-full max-w-md text-center text-white p-6 rounded-2xl border border-cyan-400/20 bg-black/30 backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,255,0.3)]">
            <CardHeader className="p-0">
                <div className="inline-block p-4 mb-4 bg-cyan-400/10 border-2 border-cyan-400/20 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                    <Fingerprint className="h-10 w-10 text-cyan-300" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-white">KYC Coming Soon</CardTitle>
                <CardDescription className="text-cyan-200/70 pt-2">
                    Our mainnet launch is in progress. KYC verification will be required soon to secure your account and enable all features.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-6">
                <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-black/20 border border-amber-400/20">
                    <Clock className="h-5 w-5 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-200">You will be notified!</p>
                        <p className="text-xs text-amber-200/70">We will announce when KYC is ready.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

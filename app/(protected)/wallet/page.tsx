
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function WalletPage() {
    const { userProfile } = useAuth();
    const router = useRouter();

    return (
        <div className="flex flex-col h-screen app-background">
            <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-amber-400/20">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold">My Wallet</h1>
                <div className="w-9"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-40">
                 <Card className="futuristic-card-bg-secondary">
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-amber-300/70 uppercase tracking-widest">Available Coins</p>
                        <div className="flex items-baseline justify-center gap-2 mt-2">
                            <span className="text-3xl sm:text-5xl font-bold tracking-wider text-white">{(userProfile?.minedCoins || 0).toFixed(4)}</span>
                            <span className="text-xl sm:text-2xl font-semibold text-amber-300/80">BLIT</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="futuristic-card-bg-secondary">
                    <CardHeader>
                        <CardTitle className="text-amber-200">Withdraw Coins</CardTitle>
                        <CardDescription className="text-amber-300/70">
                            Withdrawal functionality is currently under development. This feature will be enabled soon.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </main>
        </div>
    );
}

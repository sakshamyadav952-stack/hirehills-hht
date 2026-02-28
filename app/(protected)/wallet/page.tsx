
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Wallet, Info } from 'lucide-react';
import { useState } from 'react';

export default function WalletPage() {
    const { userProfile } = useAuth();
    const router = useRouter();
    const [address, setAddress] = useState('');

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
                            Enter your Solana (SOL) wallet address to prepare for future withdrawals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="wallet-address" className="text-amber-200/90">Wallet Address</Label>
                            <Input 
                                id="wallet-address" 
                                placeholder="Enter your SOL wallet address" 
                                className="bg-slate-900/50 border-amber-400/30 text-white"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>

                        <div className="p-4 rounded-lg bg-black/30 border border-cyan-400/20 flex gap-3">
                            <Info className="h-5 w-5 text-cyan-400 shrink-0" />
                            <p className="text-xs text-cyan-100/80 leading-relaxed">
                                Withdrawal functionality is currently under development. This feature will be enabled soon. Your entered address will be validated during the withdrawal phase.
                            </p>
                        </div>

                        <Button disabled className="w-full h-14 bg-slate-800 text-slate-400 border border-slate-700 opacity-50 cursor-not-allowed">
                            <Wallet className="mr-2 h-5 w-5" />
                            Withdraw Coins (Coming Soon)
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

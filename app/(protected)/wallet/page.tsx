'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Wallet, Info } from 'lucide-react';

export default function WalletPage() {
    const { userProfile } = useAuth();
    const router = useRouter();

    return (
        <div className="flex flex-col h-screen app-background">
            <header className="sticky top-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-background/80 backdrop-blur-md border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-foreground hover:bg-accent/10 h-9 w-9">
                    <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">My Wallet</h1>
                <div className="w-9"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 pb-40">
                 <Card className="bg-card border-border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                    <CardContent className="p-6 sm:p-8 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-[0.2em] font-black">Available Balance</p>
                        <div className="flex items-baseline justify-center gap-1 sm:gap-2 mt-2">
                            <span className="text-2xl xs:text-3xl sm:text-5xl font-black tracking-wider text-foreground">
                                {(userProfile?.minedCoins || 0).toFixed(4)}
                            </span>
                            <span className="text-sm sm:text-2xl font-bold text-primary italic">HOT</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden">
                    <CardHeader className="p-5 sm:p-6 pb-2">
                        <CardTitle className="text-base sm:text-lg text-foreground font-black uppercase tracking-tight flex items-center gap-2">
                            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            Withdraw Assets
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-xs sm:text-sm pt-1">
                            Asset extraction is currently restricted to verified nodes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-secondary/50 border border-border">
                            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                                Protocol Notice: Your cumulative yield will undergo validation during the withdrawal cycle. Ensure your Solana wallet is authorized for HOT transmissions.
                            </p>
                        </div>
                        <Button 
                            disabled 
                            className="w-full h-12 sm:h-14 bg-muted text-muted-foreground font-black uppercase tracking-widest text-[10px] sm:text-xs rounded-xl sm:rounded-2xl border border-border"
                        >
                            Withdraw HOT (Locked)
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

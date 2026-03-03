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
            <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-foreground hover:bg-accent/10">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">My Wallet</h1>
                <div className="w-9"></div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-40">
                 <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground uppercase tracking-widest font-black">Available HOT</p>
                        <div className="flex items-baseline justify-center gap-2 mt-2">
                            <span className="text-3xl sm:text-5xl font-black tracking-wider text-foreground">{(userProfile?.minedCoins || 0).toFixed(4)}</span>
                            <span className="text-xl sm:text-2xl font-bold text-primary">HOT</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Withdraw Tokens
                        </CardTitle>
                        <CardDescription className="text-muted-foreground pt-2">
                            Withdrawal functionality is currently under development. This feature will be enabled soon.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Your balance will be validated during the withdrawal phase. Ensure your Solana wallet is ready for HOT transmissions.
                            </p>
                        </div>
                        <Button disabled className="w-full h-14 bg-muted text-muted-foreground font-bold uppercase tracking-widest text-xs rounded-2xl border border-border">
                            Withdraw HOT (Coming Soon)
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

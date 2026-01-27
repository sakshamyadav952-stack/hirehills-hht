
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Banknote, Coins, Loader2, Send, Wallet, ArrowLeft, Building2, BadgeCheck, BadgeX, Clock, Fingerprint, Info, Globe, ExternalLink, Copy } from 'lucide-react';
import type { WithdrawalRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SendCoinsFlow } from '@/components/send-coins-flow';
import { TransactionHistory } from '@/components/transaction-history';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { NetworkStrengthIndicator } from '@/components/network-strength-indicator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';


function WithdrawalHistory() {
    const { userProfile, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const sortedRequests = userProfile?.withdrawalRequests?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

    if (sortedRequests.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed border-cyan-400/20 rounded-lg">
                <p className="text-sm text-muted-foreground">You haven't made any withdrawal requests yet.</p>
            </div>
        );
    }

    return (
        <Card className="futuristic-card-bg-secondary mt-6">
            <CardHeader>
                <CardTitle className="text-amber-200">Withdrawal History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {sortedRequests.map(req => (
                    <Card key={req.requestId} className="futuristic-card-bg-secondary">
                        <CardContent className="p-4 grid gap-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{req.requestedAmount} BLIT</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(req.createdAt), 'PPP p')}</p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "capitalize",
                                        req.status === 'completed' && "border-green-500 text-green-500",
                                        req.status === 'rejected' && "border-red-500 text-red-500",
                                        req.status === 'pending' && "border-yellow-500 text-yellow-500",
                                    )}
                                >
                                    {req.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}

function GeckoTerminalChart() {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="relative rounded-lg overflow-hidden" style={{ height: '1800px', pointerEvents: 'none' }}>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="space-y-4 w-full p-4">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-40 w-full" />
                        <div className="flex justify-between">
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-6 w-12" />
                        </div>
                    </div>
                </div>
            )}
            <iframe
                src="https://www.geckoterminal.com/solana/pools/4T1Fiv8HQHEJN6xv8hbRkCSQ8SRCCqU7uiZiviEDo48q?embed=1"
                frameBorder="0"
                width="100%"
                height="1980"
                className={cn("rounded-lg transition-opacity duration-500", isLoading ? 'opacity-0' : 'opacity-100')}
                style={{ marginTop: '-210px' }}
                scrolling="yes"
                onLoad={() => setIsLoading(false)}
            ></iframe>
        </div>
    );
}

export default function WalletPage() {
    const { userProfile, requestWithdrawal, toast } = useAuth();
    const router = useRouter();
    const [isUpiDialogOpen, setIsUpiDialogOpen] = useState(false);
    const [isKycInfoDialogOpen, setIsKycInfoDialogOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    
    const [withdrawalMethod, setWithdrawalMethod] = useState<'upi' | 'bank'>('upi');
    const [upiId, setUpiId] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [activeTab, setActiveTab] = useState('withdraw');
    const trackContentRef = useRef<HTMLDivElement>(null);
    const mintAddress = "DroD1m6wAJXTUoLsXfaUvZrbRmNVVLLXoayFMkvmw3oc";

    const handleCopy = () => {
        navigator.clipboard.writeText(mintAddress);
        setIsCopied(true);
        toast({
            title: "Copied!",
            description: "Mint address copied to clipboard.",
        });
        setTimeout(() => setIsCopied(false), 2000);
    };


    useEffect(() => {
        if (activeTab === 'track' && trackContentRef.current) {
            const timer = setTimeout(() => {
                const mainContentArea = document.querySelector('.overflow-y-auto');
                if(mainContentArea) {
                     mainContentArea.scrollTo({
                        top: mainContentArea.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    const withdrawSchema = z.object({
        amount: z.coerce.number()
          .positive({ message: 'Amount must be greater than 0.' })
          .max(userProfile?.minedCoins || 0, { message: "You don't have enough coins." }),
    });

    const form = useForm<z.infer<typeof withdrawSchema>>({
        resolver: zodResolver(withdrawSchema),
        defaultValues: { amount: 0 },
    });

    function onWithdrawClick() {
        setIsKycInfoDialogOpen(true);
    }

    const handleConfirmWithdrawal = async () => {
        let details: Partial<WithdrawalRequest> = {
            requestedAmount: withdrawAmount,
            withdrawalMethod,
            requestType: 'coins',
        };
        let isValid = false;

        if (withdrawalMethod === 'upi') {
            if (upiId.trim()) {
                details.upiId = upiId;
                isValid = true;
            }
        } else if (withdrawalMethod === 'bank') {
            if (bankName.trim() && accountHolderName.trim() && accountNumber.trim() && ifscCode.trim()) {
                details.bankName = bankName;
                details.accountHolderName = accountHolderName;
                details.accountNumber = accountNumber;
                details.ifscCode = ifscCode;
                isValid = true;
            }
        }

        if (!isValid) return;

        setIsSubmitting(true);
        try {
            await requestWithdrawal(details);
            setIsUpiDialogOpen(false);
            setUpiId('');
            setBankName('');
            setAccountHolderName('');
            setAccountNumber('');
            setIfscCode('');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const networkStrength = userProfile?.referrals?.length || 0;
    
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
                        <p className="text-sm text-amber-300/70 uppercase tracking-widest">Blistree Coins</p>
                        <div className="flex items-baseline justify-center gap-2 mt-2">
                            <span className="text-3xl sm:text-5xl font-bold tracking-wider text-white">{(userProfile?.minedCoins || 0).toFixed(1)}</span>
                            <span className="text-xl sm:text-2xl font-semibold text-amber-300/80">BLIT</span>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="withdraw" onValueChange={setActiveTab} className="w-full">
                    <TabsList className={cn("grid w-full bg-black/20 border border-cyan-400/20 rounded-lg", userProfile?.isAdmin ? "grid-cols-3" : "grid-cols-3")}>
                        <TabsTrigger value="send" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white">Send</TabsTrigger>
                        <TabsTrigger value="withdraw" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white">Withdraw</TabsTrigger>
                        <TabsTrigger value="track" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white">Track</TabsTrigger>
                    </TabsList>

                    <TabsContent value="send" className="mt-6 space-y-6">
                        <Card className="futuristic-card-bg-secondary">
                             <CardContent className="p-6">
                                <SendCoinsFlow />
                            </CardContent>
                        </Card>
                         <Card className="futuristic-card-bg-secondary">
                            <CardHeader>
                                <CardTitle className="text-amber-200">Coin Transfer History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TransactionHistory />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="withdraw" className="mt-6 space-y-6">
                        <NetworkStrengthIndicator referralCount={userProfile?.referrals?.length || 0} />
                        <Card className="futuristic-card-bg-secondary">
                            <CardHeader className="text-center">
                                <CardTitle className="text-amber-200">Withdraw Coins</CardTitle>
                                <CardDescription className="text-amber-300/70">Enter the amount of Blistree coins you want to withdraw.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-w-sm mx-auto">
                                    <p className="text-sm text-muted-foreground text-center">
                                        Your current coin balance is <span className="font-bold text-amber-300">{(userProfile?.minedCoins || 0).toFixed(4)} BLIT</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground text-center">You can request once every 24 hours.</p>

                                    <Form {...form}>
                                        <form onSubmit={(e) => { e.preventDefault(); onWithdrawClick(); }} className="space-y-4">
                                            <FormField
                                            control={form.control}
                                            name="amount"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-amber-200/90 sr-only">Amount (BLIT)</FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                className="bg-slate-900/50 border-amber-400/30 text-white text-center pr-12"
                                                                {...field}
                                                                onChange={(e) => {
                                                                    field.onChange(e);
                                                                    const value = parseFloat(e.target.value);
                                                                    if (!isNaN(value)) {
                                                                        setWithdrawAmount(value);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-amber-300 hover:text-white"
                                                                onClick={() => form.setValue('amount', userProfile?.minedCoins || 0)}
                                                            >
                                                                Max
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                            <Button type="submit" className="w-full bg-amber-500 text-black hover:bg-amber-400">
                                                <Banknote className="mr-2 h-4 w-4" />
                                                Request Withdrawal
                                            </Button>
                                        </form>
                                    </Form>
                                </div>
                            </CardContent>
                        </Card>
                        <WithdrawalHistory />
                    </TabsContent>
                    <TabsContent value="track" ref={trackContentRef} className="mt-6 space-y-6">
                        <div className="text-center p-4 rounded-lg border border-cyan-400/20 bg-slate-900/50 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                            <div className="flex justify-center items-center gap-2 mb-2">
                                <Globe className="h-6 w-6 text-cyan-300" />
                                <h2 className="text-2xl font-bold tracking-tight text-cyan-300" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
                                    Live Market Data
                                </h2>
                            </div>
                            <p className="text-sm text-cyan-200/80">
                                This chart is sourced directly from GeckoTerminal. Click below for more details.
                            </p>
                            <Button asChild variant="link" className="mt-4 text-cyan-300 hover:text-white">
                                <Link href="https://www.geckoterminal.com/solana/pools/4T1Fiv8HQHEJN6xv8hbRkCSQ8SRCCqU7uiZiviEDo48q?utm_source=coingecko&utm_medium=referral&utm_campaign=searchresults" target="_blank" rel="noopener noreferrer">
                                    View Full Chart on GeckoTerminal <ExternalLink className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                             <div className="mt-4 space-y-2">
                                <p className="text-xs text-muted-foreground">Token Mint Address:</p>
                                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-slate-800/70 border border-slate-700">
                                    <p className="font-mono text-xs text-cyan-200 truncate">{mintAddress}</p>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-cyan-300 hover:bg-cyan-400/10 hover:text-white" onClick={handleCopy}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                         <GeckoTerminalChart />
                         <p className="text-xs text-muted-foreground text-center">
                            Blistree does not encourage users to buy BLIT from any platform. BLIT tokens are distributed free to miners within the app. The market data shown here is only for informational purposes, so users can track the token’s performance. All purchases happen outside the app; we do not provide financial, trading, or investment services.
                        </p>
                    </TabsContent>
                </Tabs>
            </main>

            <Dialog open={isKycInfoDialogOpen} onOpenChange={setIsKycInfoDialogOpen}>
                <DialogContent className="text-white border-cyan-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-cyan-300 flex items-center gap-2">
                            <Fingerprint /> KYC & Withdrawal Information
                        </DialogTitle>
                         <div className="text-sm text-cyan-200/80 pt-4 space-y-3">
                            <p>To ensure security and compliance, withdrawals are enabled only after completing KYC (Know Your Customer) verification.</p>
                            {networkStrength < 5 ? (
                                <div className="p-3 rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-200">
                                    <p className="font-semibold flex items-center gap-2"><Info className="h-4 w-4" /> Your Network is Growing!</p>
                                    <p className="text-sm mt-1">To get priority access in the next KYC slot, increase your network strength by referring more friends. Users with a 'Strong' network (5+ referrals) will be first in line for withdrawals.</p>
                                </div>
                            ) : (
                                 <div className="p-3 rounded-lg border border-green-400/30 bg-green-500/10 text-green-200">
                                    <p className="font-semibold flex items-center gap-2"><BadgeCheck className="h-4 w-4" /> Strong Network!</p>
                                    <p className="text-sm mt-1">You have a strong network and will be prioritized for the next KYC slot. We will notify you when it becomes available.</p>
                                </div>
                            )}
                            <p className="font-semibold">KYC slots will be released very soon. Stay tuned!</p>
                        </div>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                           <Button type="button" variant="outline" className="w-full bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isUpiDialogOpen} onOpenChange={setIsUpiDialogOpen}>
                <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-amber-300">Confirm Withdrawal</DialogTitle>
                        <DialogDescription className="text-amber-200/80">
                            You are about to request a withdrawal of {withdrawAmount.toFixed(2)} BLIT. Please provide your payment details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                         <div className="space-y-2">
                            <Label htmlFor="withdrawal-method" className="text-amber-200/90">Withdrawal Method</Label>
                            <Select onValueChange={(value: 'upi' | 'bank') => setWithdrawalMethod(value)} defaultValue={withdrawalMethod}>
                                <SelectTrigger id="withdrawal-method" className="bg-slate-900/50 border-amber-400/30 text-white">
                                    <SelectValue placeholder="Select a method" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="bank">Bank Account</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {withdrawalMethod === 'upi' && (
                            <div className="space-y-2">
                                <Label htmlFor="upi-id" className="text-amber-200/90">UPI ID</Label>
                                <Input 
                                    id="upi-id" 
                                    placeholder="yourname@bank" 
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                    className="bg-slate-900/50 border-amber-400/30 text-white"
                                />
                            </div>
                        )}

                        {withdrawalMethod === 'bank' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="account-holder-name" className="text-amber-200/90">Account Holder Name</Label>
                                    <Input id="account-holder-name" placeholder="John Doe" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank-name" className="text-amber-200/90">Bank Name</Label>
                                    <Input id="bank-name" placeholder="Global Bank Inc." value={bankName} onChange={(e) => setBankName(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account-number" className="text-amber-200/90">Account Number</Label>
                                    <Input id="account-number" placeholder="1234567890" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ifsc-code" className="text-amber-200/90">Routing Number / Code</Label>
                                    <Input id="ifsc-code" placeholder="GBIN0123456" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleConfirmWithdrawal} disabled={isSubmitting} className="bg-amber-500 text-black hover:bg-amber-400">
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

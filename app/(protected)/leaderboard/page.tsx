

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp, limit, startAfter, DocumentSnapshot, documentId } from 'firebase/firestore';
import type { UserProfile, TournamentConfig, PrizeTier, ConcludedTournament } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, ArrowLeft, Crown, DollarSign, Medal, Users, ShieldAlert, Check, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';

type RankedUser = UserProfile & { rank: number };
const PAGE_SIZE = 10;

function UserReferralsDialog({ user, open, onOpenChange, tournamentConfig }: { user: RankedUser | null, open: boolean, onOpenChange: (open: boolean) => void, tournamentConfig: TournamentConfig | null }) {
    const firestore = useFirestore();
    const [referrals, setReferrals] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open || !firestore || !user?.referrals || user.referrals.length === 0 || !tournamentConfig) {
            setReferrals([]);
            return;
        }

        const fetchReferrals = async () => {
            setIsLoading(true);
            try {
                // Firestore 'in' query has a limit of 30
                const referralIds = user.referrals.slice(0, 30);
                if (referralIds.length === 0) {
                    setReferrals([]);
                    setIsLoading(false);
                    return;
                }
                const referralsQuery = query(collection(firestore, 'users'), where(documentId(), 'in', referralIds));
                const snapshot = await getDocs(referralsQuery);
                let referralsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as UserProfile);
                
                // NEW: Filter by tournament dates
                if (tournamentConfig.startDate && tournamentConfig.endDate) {
                    const leagueStart = tournamentConfig.startDate instanceof Timestamp ? tournamentConfig.startDate.toMillis() : new Date(tournamentConfig.startDate).getTime();
                    const leagueEnd = tournamentConfig.endDate instanceof Timestamp ? tournamentConfig.endDate.toMillis() : new Date(tournamentConfig.endDate).getTime();

                    referralsData = referralsData.filter(ref => {
                        const appliedAt = (ref.referralAppliedAt as Timestamp)?.toMillis();
                        return appliedAt && appliedAt >= leagueStart && appliedAt <= leagueEnd;
                    });
                }
                
                referralsData.sort((a, b) => {
                    const timeA = (a.createdAt as Timestamp)?.toMillis() || 0;
                    const timeB = (b.createdAt as Timestamp)?.toMillis() || 0;
                    return timeB - timeA;
                });
                
                setReferrals(referralsData);

            } catch (error) {
                console.error("Error fetching referrals:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReferrals();

    }, [open, firestore, user, tournamentConfig]);

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="text-white border-cyan-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                <DialogHeader>
                    <DialogTitle className="text-cyan-300">Referrals by {user.fullName}</DialogTitle>
                    <DialogDescription className="text-cyan-200/80">
                        Showing referrals made during the current league session.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto space-y-4 py-4 pr-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : referrals.length > 0 ? (
                        referrals.map(ref => (
                            <div key={ref.id} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={ref.profileImageUrl} alt={ref.fullName} />
                                    <AvatarFallback>{ref.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-white">{ref.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{ref.profileCode}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground">No referrals found for this league session.</p>
                    )}
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-400">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const Countdown = ({ expiryDate }: { expiryDate: Date | Timestamp }) => {
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
        return <div className="text-red-400 font-bold text-sm">Ended</div>;
    }

    return (
        <div className="flex justify-center gap-1.5">
            <TimeUnit value={timeLeft.days} label="Days" />
            <TimeUnit value={timeLeft.hours} label="Hrs" />
            <TimeUnit value={timeLeft.minutes} label="Mins" />
            <TimeUnit value={timeLeft.seconds} label="Secs" />
        </div>
    );
};

const TimeUnit = ({ value, label }: { value: number; label: string; }) => (
    <div className="p-1 bg-black/20 rounded-md text-center min-w-[32px] border border-slate-700">
        <div className="font-mono font-bold text-slate-200 text-base">{String(value).padStart(2, '0')}</div>
        <div className="text-[10px] text-slate-400 uppercase leading-tight">{label}</div>
    </div>
);

const getPrizeForRank = (rank: number, tiers: PrizeTier[]): number => {
    const tier = tiers.find(t => rank >= t.startRank && rank <= t.endRank);
    return tier ? tier.prize : 0;
};

const LeaderboardListItem = ({ user, isCurrentUser, prizeTiers, onReferralsClick }: { user: RankedUser, isCurrentUser: boolean, prizeTiers: PrizeTier[], onReferralsClick: (user: RankedUser) => void }) => {
    const rank = user.rank;
    const prize = getPrizeForRank(rank, prizeTiers);

    const rankColor = useMemo(() => {
        if (isCurrentUser) return "border-blue-500 bg-blue-900/30 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.6)]";
        if (rank === 1) return "border-amber-400 bg-amber-900/30 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)]";
        if (rank === 2) return "border-slate-400 bg-slate-800/50 text-slate-300 shadow-[0_0_15px_rgba(156,163,175,0.4)]";
        if (rank === 3) return "border-orange-500 bg-orange-900/30 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.4)]";
        return "border-slate-700 bg-slate-800/40";
    }, [rank, isCurrentUser]);

    return (
        <div className={cn(
            "border-2 p-3 rounded-xl transition-all",
            rankColor,
        )}>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-20 text-center">
                        {rank === 1 && <Crown className="mx-auto h-6 w-6 text-amber-400 mb-1" />}
                        {rank === 2 && <Medal className="mx-auto h-6 w-6 text-slate-300 mb-1" />}
                        {rank === 3 && <Medal className="mx-auto h-6 w-6 text-orange-400 mb-1" />}
                        <p className="font-bold text-lg">Rank #{rank}</p>
                    </div>
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                        <p className="font-semibold text-white truncate">{user.fullName}{isCurrentUser && " (You)"}</p>
                        <p className="text-sm text-slate-400">Referrals: {user.tournamentScore || 0}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end gap-2">
                     <p className={cn("text-lg font-bold flex items-center justify-end", prize > 0 ? "text-green-400" : "text-white")}>
                        <DollarSign className="h-4 w-4 mr-0.5" />
                        {prize.toFixed(2)}
                    </p>
                    {(user.tournamentScore || 0) > 0 && (
                         <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-auto py-1 px-2 text-indigo-300 hover:bg-indigo-500/20 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReferralsClick(user);
                            }}
                        >
                            View Referrals
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
};


export default function LeaderboardPage() {
    const { userProfile: currentUser, loading: authLoading, verifyUsdcAddress, requestUsdcWithdrawal } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig | null>(null);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalPlayers, setTotalPlayers] = useState(0);
    const [usdcAddress, setUsdcAddress] = useState(currentUser?.usdcAddress || '');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const [withdrawnAmount, setWithdrawnAmount] = useState(0);
    const [showReferralsDialog, setShowReferralsDialog] = useState(false);
    const [selectedUserForReferrals, setSelectedUserForReferrals] = useState<RankedUser | null>(null);

    const amountToWithdraw = currentUser?.tournamentWinning || 0;

    useEffect(() => {
        if(currentUser?.usdcAddress) {
            setIsVerified(true);
        }
    }, [currentUser?.usdcAddress]);

    useEffect(() => {
        if (leaderboard.length > 0) {
            requestAnimationFrame(() => {
                window.dispatchEvent(new Event('resize'));
            });
        }
    }, [leaderboard]);
    

    const fetchActiveLeaderboard = useCallback(async (config: TournamentConfig, startAfterDoc: DocumentSnapshot | null = null) => {
        if (!firestore) return;
        
        const loader = startAfterDoc ? setIsLoadingMore : setIsLoading;
        loader(true);

        try {
            const baseQuery = query(
                collection(firestore, 'users'),
                where('tournamentId', '==', config.id),
                orderBy('tournamentScore', 'desc'),
                orderBy('tournamentScoreLastUpdated', 'asc')
            );
            
            let finalQuery = query(baseQuery, limit(PAGE_SIZE));
            if(startAfterDoc) {
                finalQuery = query(finalQuery, startAfter(startAfterDoc));
            }

            const querySnapshot = await getDocs(finalQuery);
            const newUsers = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            } as UserProfile));

            setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
            setIsLastPage(querySnapshot.docs.length < PAGE_SIZE);
            
            setLeaderboard(prev => {
                const existingUsers = startAfterDoc ? prev : [];
                const combined = [...existingUsers, ...newUsers];
                return combined.map((user, index) => ({
                    ...user,
                    rank: index + 1
                }));
            });

        } catch (error) {
            console.error("Error fetching leaderboard:", error);
            if ((error as any).code === 'failed-precondition') {
                 toast({
                    title: "Leaderboard Indexing",
                    description: "The leaderboard requires a new database index. Please check the developer console for a link to create it.",
                    variant: "destructive",
                    duration: 10000
                });
            }
        } finally {
            loader(false);
        }
    }, [firestore, toast]);
    
    const fetchInitialData = useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);
        setLeaderboard([]);
        setLastDoc(null);
        setIsLastPage(false);

        try {
            const configDocRef = doc(firestore, 'config', 'tournament');
            const configDoc = await getDoc(configDocRef);

            if (configDoc.exists() && configDoc.data()?.isActive) {
                const activeLeague = { id: configDoc.id, ...configDoc.data() } as TournamentConfig;
                setTournamentConfig(activeLeague);

                const usersQuery = query(collection(firestore, 'users'), where('tournamentId', '==', activeLeague.id));
                const countSnapshot = await getDocs(usersQuery);
                setTotalPlayers(countSnapshot.size);

                await fetchActiveLeaderboard(activeLeague, null);
            } else {
                const concludedQuery = query(collection(firestore, 'concludedTournaments'), orderBy('concludedAt', 'desc'), limit(1));
                const concludedSnapshot = await getDocs(concludedQuery);
                
                if (!concludedSnapshot.empty) {
                    const concludedDoc = concludedSnapshot.docs[0];
                    const concludedData = concludedDoc.data() as ConcludedTournament;

                    setTournamentConfig({
                        id: concludedDoc.id,
                        headline: concludedData.headline,
                        tagline: concludedData.tagline,
                        startDate: concludedData.startDate,
                        endDate: concludedData.concludedAt,
                        prizeTiers: concludedData.prizeTiers,
                        isActive: false,
                    });

                    const winnerUserIds = concludedData.winners.map(w => w.userId);
                    let winnersWithProfiles: RankedUser[] = [];

                    if (winnerUserIds.length > 0) {
                        const profilesQuery = query(collection(firestore, 'users'), where(documentId(), 'in', winnerUserIds.slice(0, 30)));
                        const profilesSnapshot = await getDocs(profilesQuery);
                        const profilesMap = new Map<string, UserProfile>();
                        profilesSnapshot.forEach(doc => {
                            profilesMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile);
                        });

                        winnersWithProfiles = concludedData.winners.map(winner => {
                            const profile = profilesMap.get(winner.userId);
                            return {
                                ...(profile as UserProfile),
                                id: winner.userId,
                                fullName: winner.fullName,
                                profileCode: winner.profileCode,
                                tournamentScore: winner.score,
                                rank: winner.rank,
                            } as RankedUser;
                        });
                    }

                    setLeaderboard(winnersWithProfiles);
                    setTotalPlayers(winnersWithProfiles.length);
                    setIsLastPage(true);
                } else {
                    setTournamentConfig(null);
                    setLeaderboard([]);
                    setTotalPlayers(0);
                }
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
            toast({ title: "Error", description: "Could not load leaderboard data." });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, toast, fetchActiveLeaderboard]);
    
    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);


    const handleNext = () => {
        if (!isLastPage && lastDoc && tournamentConfig?.isActive) {
            fetchActiveLeaderboard(tournamentConfig, lastDoc);
        }
    }
    
    const handleVerify = async () => {
        if (!usdcAddress.trim()) {
            setVerificationError("Address cannot be empty.");
            return;
        }
        setIsVerifying(true);
        setVerificationError(null);
        try {
            const { isValid } = await verifyUsdcAddress(usdcAddress);
            setIsVerified(isValid);
            if (!isValid) {
                setVerificationError("This is not a valid Solana address. Please double-check.");
            }
        } catch (error) {
            console.error(error);
            setVerificationError("Verification failed. Please try again.");
            setIsVerified(false);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleWithdraw = async () => {
        if (!isVerified || !usdcAddress.trim() || amountToWithdraw <= 0) {
            toast({
                title: "Address Not Verified",
                description: "Please verify your wallet address first.",
                variant: "destructive",
            });
            return;
        }
        setWithdrawnAmount(amountToWithdraw);
        setIsWithdrawing(true);
        try {
            const result = await requestUsdcWithdrawal(usdcAddress);
            if (result?.transactionId) {
                setTransactionId(result.transactionId);
                setShowSuccessDialog(true);
            } else {
                 toast({
                    title: "Withdrawal Sent",
                    description: "Your withdrawal is processing. We couldn't get a transaction ID, but please check your wallet shortly.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Withdrawal Failed",
                description: error.message || "An unknown error occurred.",
                variant: "destructive"
            });
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleReferralsClick = (user: RankedUser) => {
        setSelectedUserForReferrals(user);
        setShowReferralsDialog(true);
    };

    const { currentUserOnBoard, isCurrentUserWinner, currentUserPrize } = useMemo(() => {
        if (!currentUser || !leaderboard || !tournamentConfig) {
            return { currentUserOnBoard: null, isCurrentUserWinner: false, currentUserPrize: 0 };
        }
        
        const userOnBoard = leaderboard.find(u => u.id === currentUser.id);
        const prize = userOnBoard ? getPrizeForRank(userOnBoard.rank, tournamentConfig.prizeTiers || []) : 0;
        const winner = prize > 0;

        return { currentUserOnBoard: userOnBoard, isCurrentUserWinner: winner, currentUserPrize: prize };
    }, [currentUser, leaderboard, tournamentConfig]);

    if (authLoading || (isLoading && leaderboard.length === 0)) {
        return (
            <div className="flex h-screen items-center justify-center app-background">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }
    
    if (!tournamentConfig) {
        return (
             <div className="flex h-screen items-center justify-center app-background text-center p-4">
                <Card className="futuristic-card-bg-secondary text-white border-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <CardHeader>
                        <CardTitle className="text-purple-300">No League Found</CardTitle>
                        <CardDescription className="text-purple-200/70">There is no league data available. Check back later!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} className="bg-purple-600 hover:bg-purple-700">Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const isConcluded = !tournamentConfig.isActive;

    return (
        <div className="flex flex-col h-screen app-background">
            <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-indigo-400/20 h-16">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-indigo-300" /> Leaderboard</h1>
                <Button onClick={fetchInitialData} variant="ghost" size="icon" disabled={isLoading}>
                    <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto">
                 <div className="p-4 sm:p-6 space-y-6">
                    {isConcluded && (
                        <Card className="text-center bg-green-900/50 border-green-500 shadow-[0_0_20px_rgba(74,222,128,0.4)]">
                            <CardHeader>
                                <CardTitle className="text-2xl text-green-300">Congratulations to the Winners!</CardTitle>
                                <CardDescription className="text-green-200/80">The league has concluded. Prizes will be distributed shortly.</CardDescription>
                            </CardHeader>
                            {isCurrentUserWinner && (
                                <CardContent className="pt-4 mt-4 border-t border-green-500/20">
                                    <div className="text-left space-y-4">
                                        <p className="text-center text-lg font-semibold text-white">
                                            You've won ${currentUserPrize.toFixed(2)}!
                                        </p>
                                        <Alert variant="destructive">
                                            <ShieldAlert className="h-4 w-4" />
                                            <AlertTitle>Important Warning</AlertTitle>
                                            <AlertDescription>
                                                You must provide your main Solana (SOL) wallet address. We will send USDC to this address. Do not use an address from another blockchain (e.g., Ethereum, BSC), as this will result in the permanent loss of your reward. If you are unsure, please contact support.
                                            </AlertDescription>
                                        </Alert>
                                        <div className="space-y-2">
                                            <Label htmlFor="usdc-address" className="text-white">Your Solana Wallet Address</Label>
                                            <div className="flex gap-2 items-center">
                                                <Input 
                                                    id="usdc-address"
                                                    placeholder="Enter your Solana address"
                                                    className="bg-slate-800 border-slate-600 text-white flex-1"
                                                    value={usdcAddress}
                                                    onChange={(e) => {
                                                        setUsdcAddress(e.target.value);
                                                        setIsVerified(false);
                                                        setVerificationError(null);
                                                    }}
                                                    disabled={isVerifying || isWithdrawing}
                                                />
                                                <Button onClick={handleVerify} disabled={isVerifying || isVerified}>
                                                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin"/> : isVerified ? <Check className="h-4 w-4 text-green-400" /> : 'Verify'}
                                                </Button>
                                            </div>
                                            {verificationError && <p className="text-sm text-red-400">{verificationError}</p>}
                                        </div>
                                        <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold" onClick={handleWithdraw} disabled={!isVerified || isWithdrawing || amountToWithdraw <= 0}>
                                            {isWithdrawing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Withdraw {withdrawnAmount.toFixed(2)} USDC
                                        </Button>
                                        {transactionId && (
                                            <Button asChild variant="link" className="w-full mt-2 text-cyan-300 hover:text-white">
                                                <Link href={`https://solscan.io/tx/${transactionId}`} target="_blank" rel="noopener noreferrer">
                                                    Verify on Solscan <ExternalLink className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    )}

                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-indigo-200">Prize Tiers (USDC)</p>
                            <div className="flex flex-col gap-1 items-start">
                                {tournamentConfig.prizeTiers?.map(tier => (
                                    <div key={tier.id} className="text-left p-1 px-2 bg-black/30 rounded-md border border-indigo-400/30">
                                        <p className="text-[10px] font-bold text-indigo-300">
                                        {tier.startRank === tier.endRank ? `Rank ${tier.startRank}` : `Rank ${tier.startRank}-${tier.endRank}`}
                                        </p>
                                        <p className="text-xs font-semibold text-white flex items-center gap-0.5">
                                        <DollarSign className="h-3 w-3" />
                                        {tier.prize}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-white">{tournamentConfig.headline}</h2>
                            <p className="text-indigo-200/80 mt-1">{tournamentConfig.tagline}</p>
                            {!isConcluded && tournamentConfig.endDate && <div className="mt-4"><Countdown expiryDate={tournamentConfig.endDate} /></div>}
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="link" className="text-xs text-muted-foreground hover:text-white mt-2">Terms &amp; Conditions</Button>
                                </DialogTrigger>
                                <DialogContent className="text-white border-cyan-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                                    <DialogHeader>
                                        <DialogTitle className="text-cyan-300 flex items-center gap-2"><ShieldAlert />Referral League: Terms &amp; Conditions</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4 text-cyan-200/80">
                                        <ul className="list-disc space-y-3 pl-5">
                                            <li>Winner(s) will have to disclose their referrals made during the Referral League.</li>
                                            <li>The winner's Solana transaction address will be made public to verify payment.</li>
                                            <li>If any spam-related activity or fake referrals are found, the user's account will be made disabled.</li>
                                            <li>Blistree reserves the right to change the rules or cancel the league at any time without prior notice.</li>
                                            <li>All decisions made by the Blistree team are final.</li>
                                        </ul>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button className="w-full bg-cyan-500 text-black hover:bg-cyan-400">Understood</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                        {isConcluded ? <Badge>Concluded</Badge> : <Badge variant="secondary">Active</Badge>}
                            <div className="flex items-center gap-2 p-2 rounded-md bg-black/30 border border-slate-700">
                                <Users className="h-4 w-4 text-indigo-300" />
                                <span className="text-sm font-semibold">{totalPlayers} Players</span>
                            </div>
                        </div>
                    </div>
                </div>

                {currentUserOnBoard && tournamentConfig?.isActive && (
                    <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-indigo-400/20 py-2 px-4 sm:px-6">
                        <LeaderboardListItem user={currentUserOnBoard} isCurrentUser={true} prizeTiers={tournamentConfig.prizeTiers || []} onReferralsClick={handleReferralsClick}/>
                    </div>
                )}
                
                <div className="p-4 sm:p-6">
                    <div className="space-y-2">
                        {isLoading && leaderboard.length === 0 ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-10 w-10 animate-spin" />
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-xl">
                                <Trophy className="mx-auto h-12 w-12 text-slate-500" />
                                <h3 className="mt-4 text-lg font-semibold">Leaderboard is Empty</h3>
                                <p className="mt-1 text-sm text-muted-foreground">{isConcluded ? 'There were no winners in this league.' : 'No users have been enrolled yet.'}</p>
                            </div>
                        ) : (
                            leaderboard.map(user => (
                                <LeaderboardListItem key={user.id} user={user} isCurrentUser={user.id === currentUser?.id} prizeTiers={tournamentConfig.prizeTiers || []} onReferralsClick={handleReferralsClick}/>
                            ))
                        )}
                    </div>

                    {!isLastPage && !isConcluded && (
                        <CardFooter className="mt-6 flex justify-center p-0">
                            <Button onClick={handleNext} disabled={isLoadingMore}>
                                {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Next'}
                            </Button>
                        </CardFooter>
                    )}

                    <div className="h-20 md:hidden" />
                </div>
            </main>
             <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent className="text-white border-green-400/50" style={{ background: 'linear-gradient(145deg, #1a2e2e, #163e3e)' }}>
                    <AlertDialogHeader>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4 border-2 border-green-500/50">
                            <Check className="h-8 w-8 text-green-400" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-green-300 text-center">Withdrawal Successful!</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="text-sm text-green-200/80 text-center pt-2">
                        <div className="font-bold">{withdrawnAmount.toFixed(2)} USDC</div>
                        <div>has been sent to the address:</div>
                        <div className="font-mono text-xs break-all mt-2 p-2 bg-black/20 rounded-md">{usdcAddress}</div>
                        <div className="mt-4">It may take a few moments to reflect in your wallet.</div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowSuccessDialog(false)} className="w-full bg-green-500 text-white hover:bg-green-600">
                            Great!
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <UserReferralsDialog user={selectedUserForReferrals} open={showReferralsDialog} onOpenChange={setShowReferralsDialog} tournamentConfig={tournamentConfig} />
        </div>
    );
}


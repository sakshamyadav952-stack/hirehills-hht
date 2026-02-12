
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp, limit, startAfter, DocumentSnapshot, documentId } from 'firebase/firestore';
import type { UserProfile, TournamentConfig, PrizeTier, ConcludedTournament } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, ArrowLeft, Crown, DollarSign, Medal, Users, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type RankedUser = UserProfile & { rank: number };
const PAGE_SIZE = 10;

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

const LeaderboardListItem = ({ user, isCurrentUser, prizeTiers }: { user: RankedUser, isCurrentUser: boolean, prizeTiers: PrizeTier[] }) => {
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
                <div className="text-right flex-shrink-0 ml-4">
                     <p className={cn("text-lg font-bold flex items-center justify-end", prize > 0 ? "text-green-400" : "text-white")}>
                        <DollarSign className="h-4 w-4 mr-0.5" />
                        {prize.toFixed(2)}
                    </p>
                    <p className={cn("text-xs", prize > 0 ? "text-green-400/80" : "text-muted-foreground")}>
                        {prize > 0 ? "Currently Winning" : "Prize"}
                    </p>
                </div>
            </div>
        </div>
    )
};


export default function LeaderboardPage() {
    const { userProfile: currentUser, loading: authLoading } = useAuth();
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
    const [usdcAddress, setUsdcAddress] = useState('');

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
                const prevUsers = startAfterDoc ? prev : [];
                const combinedUsers = [...prevUsers, ...newUsers];
                return combinedUsers.map((user, index) => ({
                    ...user,
                    rank: (startAfterDoc ? prev.length : 0) + index + 1
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
                const activeTournament = { id: configDoc.id, ...configDoc.data() } as TournamentConfig;
                setTournamentConfig(activeTournament);

                const usersQuery = query(collection(firestore, 'users'), where('tournamentId', '==', activeTournament.id));
                const countSnapshot = await getDocs(usersQuery);
                setTotalPlayers(countSnapshot.size);

                await fetchActiveLeaderboard(activeTournament, null);
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
    
    const handleWithdraw = () => {
        if (!usdcAddress.trim()) {
            toast({
                title: "Address Required",
                description: "Please enter your USDC address.",
                variant: "destructive",
            });
            return;
        }
        toast({
            title: "Coming Soon",
            description: "Withdrawal functionality is under development. Your address is noted."
        });
    };

    const { currentUserOnBoard, otherUsers, isCurrentUserWinner, currentUserPrize } = useMemo(() => {
        if (!currentUser || !leaderboard || !tournamentConfig) {
            return { currentUserOnBoard: null, otherUsers: leaderboard || [], isCurrentUserWinner: false, currentUserPrize: 0 };
        }
        
        const userOnBoard = leaderboard.find(u => u.id === currentUser.id);
        const prize = userOnBoard ? getPrizeForRank(userOnBoard.rank, tournamentConfig.prizeTiers || []) : 0;
        const winner = prize > 0;
        
        const others = leaderboard.filter(u => u.id !== currentUser.id);

        return { currentUserOnBoard: userOnBoard, otherUsers: others, isCurrentUserWinner: winner, currentUserPrize: prize };
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
                        <CardTitle className="text-purple-300">No Tournament Found</CardTitle>
                        <CardDescription className="text-purple-200/70">There is no tournament data available. Check back later!</CardDescription>
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

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {isConcluded && (
                    <Card className="text-center bg-green-900/50 border-green-500 shadow-[0_0_20px_rgba(74,222,128,0.4)]">
                        <CardHeader>
                            <CardTitle className="text-2xl text-green-300">Congratulations to the Winners!</CardTitle>
                            <CardDescription className="text-green-200/80">The tournament has concluded. Prizes will be distributed shortly.</CardDescription>
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
                                            You must provide a Solana (SOL) blockchain USDC address. Sending to any other blockchain address (e.g., Ethereum, BSC) will result in the permanent loss of your reward. If you are unsure, please contact support.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="space-y-2">
                                        <Label htmlFor="usdc-address" className="text-white">Your Solana USDC Address</Label>
                                        <Input 
                                            id="usdc-address"
                                            placeholder="Enter your Solana USDC address"
                                            className="bg-slate-800 border-slate-600 text-white"
                                            value={usdcAddress}
                                            onChange={(e) => setUsdcAddress(e.target.value)}
                                        />
                                    </div>
                                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold" onClick={handleWithdraw}>
                                        Request Withdrawal
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}

                <div className="flex justify-between items-start mb-6">
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
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       {isConcluded ? <Badge>Concluded</Badge> : <Badge variant="secondary">Active</Badge>}
                        <div className="flex items-center gap-2 p-2 rounded-md bg-black/30 border border-slate-700">
                            <Users className="h-4 w-4 text-indigo-300" />
                            <span className="text-sm font-semibold">{totalPlayers} Players</span>
                        </div>
                    </div>
                </div>

                 {currentUserOnBoard && (
                     <div className="sticky top-16 z-20 bg-slate-900/95 backdrop-blur-md border-b border-indigo-400/20 py-2">
                        <LeaderboardListItem user={currentUserOnBoard} isCurrentUser={true} prizeTiers={tournamentConfig.prizeTiers || []}/>
                    </div>
                )}
                
                <div className="space-y-2">
                    {isLoading && otherUsers.length === 0 && !currentUserOnBoard ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-10 w-10 animate-spin" />
                        </div>
                    ) : otherUsers.length === 0 && !currentUserOnBoard ? (
                         <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-xl">
                            <Trophy className="mx-auto h-12 w-12 text-slate-500" />
                            <h3 className="mt-4 text-lg font-semibold">Leaderboard is Empty</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{isConcluded ? 'There were no winners in this tournament.' : 'No users have been enrolled yet.'}</p>
                        </div>
                    ) : (
                        otherUsers.map(user => (
                            <LeaderboardListItem key={user.id} user={user} isCurrentUser={false} prizeTiers={tournamentConfig.prizeTiers || []}/>
                        ))
                    )}
                </div>

                {!isLastPage && !isConcluded && (
                    <CardFooter className="mt-6 flex justify-center">
                        <Button onClick={handleNext} disabled={isLoadingMore}>
                            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Next'}
                        </Button>
                    </CardFooter>
                )}

                 <div className="h-20 md:hidden" />
            </main>
        </div>
    );
}

    

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, TournamentConfig } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, User, ArrowLeft, Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type RankedUser = UserProfile & { rank: number };

export default function LeaderboardPage() {
    const { userProfile: currentUser, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig | null>(null);

    const fetchLeaderboard = useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            const configDocRef = doc(firestore, 'config', 'tournament');
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists()) {
                setTournamentConfig(null);
                setLeaderboard([]);
                setIsLoading(false);
                return;
            }

            const activeTournament = { id: configDoc.id, ...configDoc.data() } as TournamentConfig;
            setTournamentConfig(activeTournament);

            if (!activeTournament.isActive && (activeTournament.endDate as Timestamp).toMillis() > Date.now()) {
                 setLeaderboard([]);
                 setIsLoading(false);
                 return;
            }

            const usersQuery = query(
                collection(firestore, 'users'),
                where('tournamentId', '==', activeTournament.id),
                where('tournamentScore', '>', 0),
                orderBy('tournamentScore', 'desc'),
                orderBy('tournamentScoreLastUpdated', 'asc')
            );
            const querySnapshot = await getDocs(usersQuery);
            const users = querySnapshot.docs.map((doc, index) => ({
                id: doc.id,
                ...doc.data(),
                rank: index + 1,
            } as RankedUser));
            
            setLeaderboard(users);

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
            setIsLoading(false);
        }
    }, [firestore, toast]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const currentUserOnBoard = useMemo(() => {
        if (!currentUser || !leaderboard) return null;
        return leaderboard.find(u => u.id === currentUser.id);
    }, [currentUser, leaderboard]);

    const otherUsers = useMemo(() => {
        if (!currentUser || !leaderboard) return [];
        return leaderboard.filter(u => u.id !== currentUser.id);
    }, [currentUser, leaderboard]);

    const getRankColor = (rank: number) => {
        if (rank === 1) return "border-amber-400 bg-amber-900/50 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.5)]";
        if (rank === 2) return "border-slate-400 bg-slate-800/50 text-slate-300 shadow-[0_0_15px_rgba(156,163,175,0.5)]";
        if (rank === 3) return "border-orange-500 bg-orange-900/50 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.5)]";
        return "border-slate-700 bg-slate-800/40";
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="h-6 w-6 text-amber-400" />;
        if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
        if (rank === 3) return <Medal className="h-6 w-6 text-orange-400" />;
        return <span className="font-bold text-lg w-6 text-center">{rank}</span>;
    };

    if (authLoading || (isLoading && leaderboard.length === 0)) {
        return (
            <div className="flex h-screen items-center justify-center app-background">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }
    
    if (!tournamentConfig || (!tournamentConfig.isActive && (tournamentConfig.endDate as Timestamp).toMillis() > Date.now())) {
        return (
             <div className="flex h-screen items-center justify-center app-background text-center p-4">
                <Card className="futuristic-card-bg-secondary text-white border-purple-400/20 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    <CardHeader>
                        <CardTitle className="text-purple-300">No Active Tournament</CardTitle>
                        <CardDescription className="text-purple-200/70">There is no tournament running at the moment. Check back later!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')} className="bg-purple-600 hover:bg-purple-700">Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const isTournamentEnded = (tournamentConfig.endDate as Timestamp).toMillis() < Date.now();

    return (
        <div className="flex flex-col h-screen app-background">
            <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-indigo-400/20">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-indigo-300" /> Leaderboard</h1>
                <Button onClick={fetchLeaderboard} variant="ghost" size="icon" disabled={isLoading}>
                    <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </Button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">{tournamentConfig.headline}</h2>
                    <p className="text-indigo-200/80 mt-1">{tournamentConfig.tagline}</p>
                    <div className="mt-2">
                        {!tournamentConfig.isActive ? <Badge variant="destructive">Withdrawn</Badge> : isTournamentEnded ? <Badge>Ended</Badge> : <Badge variant="secondary">Active</Badge>}
                    </div>
                </div>

                <div className="space-y-3">
                    {currentUserOnBoard && (
                        <div className={cn(
                            "border-2 p-3 rounded-xl transition-all",
                            "border-blue-500 bg-blue-900/30 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 text-center font-bold text-2xl">{currentUserOnBoard.rank}</div>
                                    <Avatar className="h-12 w-12 border-2 border-blue-400">
                                        <AvatarImage src={currentUserOnBoard.profileImageUrl} alt={currentUserOnBoard.fullName} />
                                        <AvatarFallback>{currentUserOnBoard.fullName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-white">{currentUserOnBoard.fullName} (You)</p>
                                        <p className="text-xs text-blue-300/80">{currentUserOnBoard.profileCode}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg text-white">{currentUserOnBoard.tournamentScore || 0}</p>
                                    <p className="text-xs text-blue-300/80">Score</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading && leaderboard.length === 0 && (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-10 w-10 animate-spin" />
                        </div>
                    )}

                    {!isLoading && otherUsers.length === 0 && !currentUserOnBoard ? (
                        <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-xl">
                            <Trophy className="mx-auto h-12 w-12 text-slate-500" />
                            <h3 className="mt-4 text-lg font-semibold">Leaderboard is Empty</h3>
                            <p className="mt-1 text-sm text-muted-foreground">No users have scored points in this tournament yet.</p>
                        </div>
                    ) : (
                        otherUsers.map(user => (
                            <div key={user.id} className={cn("border-2 p-3 rounded-xl", getRankColor(user.rank))}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 flex justify-center">{getRankIcon(user.rank)}</div>
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-white">{user.fullName}</p>
                                            <p className="text-xs text-slate-400">{user.profileCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg text-white">{user.tournamentScore || 0}</p>
                                        <p className="text-xs text-slate-400">Score</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                 <div className="h-20 md:hidden" />
            </main>
        </div>
    );
}


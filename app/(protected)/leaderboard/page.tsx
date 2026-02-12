
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import type { UserProfile, TournamentConfig } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, ArrowLeft, Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type RankedUser = UserProfile & { rank: number };

const PodiumUser = ({ user, rank }: { user: RankedUser | undefined, rank: number }) => {
  if (!user) {
    const placeholderStyles = {
      1: "order-2",
      2: "order-1",
      3: "order-3"
    };
    return <div className={cn("flex-1", placeholderStyles[rank as keyof typeof placeholderStyles])} />;
  }
  
  const rankStyles = {
    1: {
      card: "bg-amber-950/30 border-amber-400/70 order-2 -translate-y-4 md:-translate-y-6 shadow-[0_-10px_30px_-5px_rgba(251,191,36,0.3)] z-10",
      avatar: "border-amber-400",
      icon: <Crown className="h-7 w-7 text-amber-300" />,
      name: "text-amber-200"
    },
    2: {
      card: "bg-slate-800/50 border-slate-400/50 order-1",
      avatar: "border-slate-400",
      icon: <Medal className="h-6 w-6 text-slate-300" />,
       name: "text-slate-200"
    },
    3: {
      card: "bg-orange-950/50 border-orange-500/60 order-3",
      avatar: "border-orange-500",
      icon: <Medal className="h-6 w-6 text-orange-400" />,
       name: "text-orange-300"
    },
  };

  const style = rankStyles[rank as keyof typeof rankStyles];
  
  return (
    <div className={cn("flex flex-col items-center text-center p-2 md:p-4 rounded-t-lg border-b-0 transition-all duration-300 flex-1", style.card)}>
      <div className="font-bold text-3xl mb-1">{style.icon}</div>
      <Avatar className={cn("h-16 w-16 md:h-20 md:w-20 border-4", style.avatar)}>
        <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
      </Avatar>
      <p className={cn("font-semibold text-sm md:text-base mt-2 truncate w-full", style.name)}>{user.fullName}</p>
      <p className="font-bold text-lg text-white">{user.tournamentScore || 0}</p>
    </div>
  );
};


const LeaderboardListItem = ({ user, isCurrentUser }: { user: RankedUser, isCurrentUser: boolean }) => (
  <div className={cn("flex items-center justify-between p-2 rounded-lg transition-colors", isCurrentUser ? "bg-blue-900/40 border border-blue-500" : "bg-slate-800/40 hover:bg-slate-800/80")}>
    <div className="flex items-center gap-3">
      <div className="font-bold text-base w-8 text-center text-slate-400">{user.rank}</div>
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-white">{user.fullName}{isCurrentUser && " (You)"}</p>
        <p className="text-xs text-slate-400">{user.profileCode}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-lg text-white">{user.tournamentScore || 0}</p>
      <p className="text-xs text-slate-400">Score</p>
    </div>
  </div>
);


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

    const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
    const otherUsers = useMemo(() => leaderboard.slice(3), [leaderboard]);
    const currentUserOnBoard = useMemo(() => {
        if (!currentUser || !leaderboard) return null;
        return leaderboard.find(u => u.id === currentUser.id);
    }, [currentUser, leaderboard]);

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
                
                {isLoading && leaderboard.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-10 w-10 animate-spin" />
                    </div>
                ) : leaderboard.length === 0 ? (
                     <div className="text-center p-12 border-2 border-dashed border-slate-700 rounded-xl">
                        <Trophy className="mx-auto h-12 w-12 text-slate-500" />
                        <h3 className="mt-4 text-lg font-semibold">Leaderboard is Empty</h3>
                        <p className="mt-1 text-sm text-muted-foreground">No users have scored points in this tournament yet.</p>
                    </div>
                ) : (
                    <>
                        {topThree.length > 0 && (
                            <div className="flex items-end gap-2 md:gap-4">
                                <PodiumUser user={topThree.find(u => u.rank === 2)} rank={2} />
                                <PodiumUser user={topThree.find(u => u.rank === 1)} rank={1} />
                                <PodiumUser user={topThree.find(u => u.rank === 3)} rank={3} />
                            </div>
                        )}

                        <div className="space-y-2 pt-4">
                            {otherUsers.map(user => (
                                <LeaderboardListItem key={user.id} user={user} isCurrentUser={user.id === currentUser?.id} />
                            ))}
                        </div>
                    </>
                )}
                 <div className="h-20 md:hidden" />
            </main>
            
            {currentUserOnBoard && currentUserOnBoard.rank > 3 && (
                <div className="sticky bottom-0 bg-slate-900/50 backdrop-blur-sm p-2 pb-safe md:hidden">
                    <LeaderboardListItem user={currentUserOnBoard} isCurrentUser={true} />
                </div>
            )}
        </div>
    );
}

    

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/lib/auth';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import type { UserProfile, TournamentConfig } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trophy, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

type RankedUser = UserProfile & { rank: number };

export default function LeaderboardPage() {
    const { userProfile: currentUser, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tournamentConfig, setTournamentConfig] = useState<TournamentConfig | null>(null);

    const fetchLeaderboard = useCallback(async () => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            const configDocRef = doc(firestore, 'config', 'tournament');
            const configDoc = await getDoc(configDocRef);

            if (!configDoc.exists() || !configDoc.data()?.isActive) {
                setTournamentConfig(null);
                setLeaderboard([]);
                setIsLoading(false);
                return;
            }

            const activeTournament = { id: configDoc.id, ...configDoc.data() } as TournamentConfig;
            setTournamentConfig(activeTournament);

            const usersQuery = query(
                collection(firestore, 'users'),
                where('tournamentId', '==', activeTournament.id),
                orderBy('tournamentScore', 'desc')
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
        } finally {
            setIsLoading(false);
        }
    }, [firestore]);

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

    if (authLoading || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center app-background">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }
    
    if (!tournamentConfig) {
        return (
             <div className="flex h-screen items-center justify-center app-background text-center p-4">
                <Card className="futuristic-card-bg-secondary">
                    <CardHeader>
                        <CardTitle>No Active Tournament</CardTitle>
                        <CardDescription>There is no tournament running at the moment. Check back later!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Tournament Leaderboard</CardTitle>
                            <CardDescription>Rankings are based on completed tasks.</CardDescription>
                        </div>
                        <Button onClick={fetchLeaderboard} variant="outline" size="sm" disabled={isLoading}>
                            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {currentUserOnBoard && (
                            <Card className="bg-primary/10 border-primary/50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="font-bold text-lg w-8 text-center">{currentUserOnBoard.rank}</div>
                                        <Avatar className="h-12 w-12 border-2 border-primary">
                                            <AvatarImage src={currentUserOnBoard.profileImageUrl} alt={currentUserOnBoard.fullName} />
                                            <AvatarFallback>{currentUserOnBoard.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{currentUserOnBoard.fullName} (You)</p>
                                            <p className="text-sm text-muted-foreground">{currentUserOnBoard.profileCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg">{currentUserOnBoard.tournamentScore || 0}</p>
                                        <p className="text-xs text-muted-foreground">Score</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div className="border-t pt-4 space-y-2">
                             {otherUsers.map(user => (
                                <Card key={user.id} className="hover:bg-muted/50">
                                     <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="font-bold text-lg w-8 text-center">{user.rank}</div>
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{user.fullName}</p>
                                                <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{user.tournamentScore || 0}</p>
                                            <p className="text-xs text-muted-foreground">Score</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

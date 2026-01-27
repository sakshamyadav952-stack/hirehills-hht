
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Loader2, Coins } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function TopMinersCard() {
    const firestore = useFirestore();
    const [topUsers, setTopUsers] = useState<(UserProfile & { liveCoins: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const allUsersRef = useRef<UserProfile[]>([]);

     useEffect(() => {
        if (!firestore) return;

        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            allUsersRef.current = users;
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users for top miners:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const allUsersWithLiveCoins = allUsersRef.current.map(user => {
                let userLiveCoins = user.minedCoins || 0;

                if (user.sessionEndTime && now < user.sessionEndTime && user.miningStartTime) {
                    const baseRate = user.baseMiningRate || 0.25;
                    const boostRate = (user.miningRate2H || 0) + (user.miningRate4H || 0) + (user.miningRate8H || 0);
                    const referralBonus = (user.referrals?.length || 0) * 0.1;
                    const totalSessionMiningRate = baseRate + boostRate + referralBonus;
                    const miningRatePerSecond = totalSessionMiningRate / 3600;
    
                    const elapsedTimeSinceLastSaveMs = now - user.miningStartTime;
                    const coinsEarned = (elapsedTimeSinceLastSaveMs / 1000) * miningRatePerSecond;
                    userLiveCoins = (user.minedCoins || 0) + coinsEarned;
                }
                return { ...user, liveCoins: userLiveCoins };
            });

            allUsersWithLiveCoins.sort((a, b) => b.liveCoins - a.liveCoins);
            setTopUsers(allUsersWithLiveCoins.slice(0, 5));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Miners</CardTitle>
                <CardDescription>The top 5 users with the most Blistree tokens.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {topUsers.map((user, index) => (
                        <div key={user.id} className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                                {index + 1}
                            </div>
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{user.fullName}</p>
                                <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">{user.liveCoins.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">BLIT</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function TotalSupplyCard() {
    const firestore = useFirestore();
    const [totalLiveCoins, setTotalLiveCoins] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);
    const allUsersRef = useRef<UserProfile[]>([]);

    useEffect(() => {
        if (!firestore) return;

        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            allUsersRef.current = users;
            setUserCount(snapshot.size);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching total supply:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            let totalCoins = 0;

            allUsersRef.current.forEach(user => {
                let userLiveCoins = user.minedCoins || 0;

                if (user.sessionEndTime && now < user.sessionEndTime && user.miningStartTime) {
                    const baseRate = user.baseMiningRate || 0.25;
                    const boostRate = (user.miningRate2H || 0) + (user.miningRate4H || 0) + (user.miningRate8H || 0);
                    const referralBonus = (user.referrals?.length || 0) * 0.1;
                    const totalSessionMiningRate = baseRate + boostRate + referralBonus;
                    const miningRatePerSecond = totalSessionMiningRate / 3600;
    
                    const elapsedTimeSinceLastSaveMs = now - user.miningStartTime;
                    const coinsEarned = (elapsedTimeSinceLastSaveMs / 1000) * miningRatePerSecond;
                    userLiveCoins = (user.minedCoins || 0) + coinsEarned;
                }
                totalCoins += userLiveCoins;
            });
            setTotalLiveCoins(totalCoins);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Total Circulating Supply</CardTitle>
                <CardDescription>The total number of Blistree tokens currently mined by all users.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <Coins className="h-16 w-16 text-primary" />
                    <div className="text-4xl font-bold tracking-tighter">
                        {totalLiveCoins.toFixed(4)}
                        <span className="text-lg font-medium text-muted-foreground ml-2">BLIT</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Across {userCount} users</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function TrackPage() {
    return (
        <div className="container mx-auto py-10 pb-24">
            <h1 className="text-3xl font-bold mb-6">Track</h1>
            <Tabs defaultValue="total-supply" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="total-supply">Total Supply</TabsTrigger>
                    <TabsTrigger value="top-miners">Top Miners</TabsTrigger>
                </TabsList>
                <TabsContent value="total-supply" className="mt-6">
                   <TotalSupplyCard />
                </TabsContent>
                <TabsContent value="top-miners" className="mt-6">
                    <TopMinersCard />
                </TabsContent>
            </Tabs>
        </div>
    );
}

    
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit, startAfter, endBefore, limitToLast, DocumentSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Clapperboard, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

export default function ActiveSessionsPage() {
    const firestore = useFirestore();
    const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageHistory, setPageHistory] = useState<{first: DocumentSnapshot | null, last: DocumentSnapshot | null}[]>([{first: null, last: null}]);
    const [isLastPage, setIsLastPage] = useState(false);
    const [totalActiveCount, setTotalActiveCount] = useState<number | null>(null);

    const fetchActiveUsers = useCallback(async (direction: 'next' | 'prev' | 'reset') => {
        if (!firestore) return;
        setIsLoading(true);

        let newPage = page;
        let finalQuery;
        const nowTimestamp = Date.now();

        try {
            const baseQuery = query(
                collection(firestore, 'users'),
                where('sessionEndTime', '>', nowTimestamp),
                orderBy('sessionEndTime', 'desc')
            );
            
            if (direction === 'next') {
                const lastDoc = pageHistory[page]?.last;
                if (lastDoc === undefined) {
                    setIsLoading(false);
                    return;
                }
                newPage = page + 1;
                finalQuery = query(baseQuery, startAfter(lastDoc), limit(PAGE_SIZE));
            } else if (direction === 'prev' && page > 1) {
                const firstDoc = pageHistory[page - 1]?.first;
                newPage = page - 1;
                finalQuery = query(baseQuery, endBefore(firstDoc), limitToLast(PAGE_SIZE));
            } else { // reset
                newPage = 1;
                setPageHistory([{first: null, last: null}]);
                finalQuery = query(baseQuery, limit(PAGE_SIZE));
            }

            const documentSnapshots = await getDocs(finalQuery);
            const users = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));

            if (direction === 'prev' && page > 1) {
              setPageHistory(prev => prev.slice(0, -1));
            }

            setActiveUsers(users);
            
            const firstVisible = documentSnapshots.docs[0];
            const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];

            if(direction === 'next') {
              setPageHistory(prev => [...prev, {first: firstVisible, last: newLastVisible}]);
            } else if (direction === 'reset') {
              setPageHistory([{first: null, last: null}, {first: firstVisible, last: newLastVisible}]);
            }
            
            setPage(newPage);
            setIsLastPage(documentSnapshots.docs.length < PAGE_SIZE);

        } catch (error) {
            console.error("Error fetching active sessions:", error);
            setIsLastPage(true);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, page, pageHistory]);

    useEffect(() => {
        if (!firestore) return;

        const countQuery = query(collection(firestore, 'users'), where('sessionEndTime', '>', Date.now()));
        const unsubscribe = onSnapshot(countQuery, (snapshot) => {
            setTotalActiveCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [firestore]);


    useEffect(() => {
        fetchActiveUsers('reset');
    }, [firestore, fetchActiveUsers]);


    if (isLoading && activeUsers.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Active Mining Sessions</CardTitle>
                            <CardDescription>
                                Showing users with an active mining session.
                            </CardDescription>
                             {totalActiveCount !== null && (
                                <div className="mt-4 flex items-center text-lg font-semibold text-primary">
                                    <Activity className="h-5 w-5 mr-2" />
                                    <span>Total Active: {totalActiveCount}</span>
                                </div>
                            )}
                        </div>
                         <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchActiveUsers('prev')}
                                disabled={page === 1 || isLoading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchActiveUsers('next')}
                                disabled={isLastPage || isLoading}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {activeUsers.length === 0 ? (
                         <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                            <Activity className="h-12 w-12 text-muted-foreground" />
                            <h3 className="font-semibold">No Active Sessions</h3>
                            <p className="text-sm text-muted-foreground">There are currently no users with an active mining session.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeUsers.map(user => (
                                <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-semibold hover:underline">{user.fullName}</Link>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Session ends: {user.sessionEndTime ? formatDistanceToNow(user.sessionEndTime, { addSuffix: true }) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clapperboard className="h-5 w-5 text-muted-foreground" />
                                            <Badge variant="secondary">
                                                {user.adWatchHistory?.length || 0} ads watched
                                            </Badge>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                             {isLoading && activeUsers.length > 0 && (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

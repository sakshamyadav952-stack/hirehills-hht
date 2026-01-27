
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, endBefore, limitToLast, DocumentSnapshot, Timestamp, where, getDoc, doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, ChevronLeft, Hash, UserCheck, UserPlus, Users, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 10;
type SortOrder = 'createdAt' | 'referred';

type EnrichedUser = UserProfile & { referrerProfileCode?: string };

export default function UsersPage() {
    const firestore = useFirestore();
    const [users, setUsers] = useState<EnrichedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageHistory, setPageHistory] = useState<{first: DocumentSnapshot | null, last: DocumentSnapshot | null}[]>([{first: null, last: null}]);
    const [isLastPage, setIsLastPage] = useState(false);
    const [sortOrder, setSortOrder] = useState<SortOrder>('createdAt');
    const [todaysRegistrations, setTodaysRegistrations] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [todaysReferrals, setTodaysReferrals] = useState(0);


    useEffect(() => {
        if (!firestore) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const todayQuery = query(collection(firestore, 'users'), where('createdAt', '>=', startOfToday));
        const unsubscribeToday = onSnapshot(todayQuery, (snapshot) => {
            setTodaysRegistrations(snapshot.size);
            const referredCount = snapshot.docs.filter(doc => !!doc.data().referredBy).length;
            setTodaysReferrals(referredCount);
        });

        const totalQuery = query(collection(firestore, 'users'));
        const unsubscribeTotal = onSnapshot(totalQuery, (snapshot) => {
            setTotalUsers(snapshot.size);
        });


        return () => {
            unsubscribeToday();
            unsubscribeTotal();
        };
    }, [firestore]);

    const fetchUsers = useCallback(async (direction: 'next' | 'prev' | 'reset') => {
        if (!firestore) return;
        setIsLoading(true);

        let newPage = page;
        let finalQuery;

        try {
            const baseQuery = collection(firestore, 'users');
            
            if (direction === 'next') {
                const lastDoc = pageHistory[page]?.last;
                if(lastDoc === undefined) {
                    setIsLoading(false);
                    return;
                }
                newPage = page + 1;
                
                if (sortOrder === 'referred') {
                    finalQuery = query(baseQuery, orderBy('referralAppliedAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
                } else {
                    finalQuery = query(baseQuery, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
                }
            } else if (direction === 'prev' && page > 1) {
                const firstDoc = pageHistory[page - 1]?.first;
                newPage = page - 1;

                if (sortOrder === 'referred') {
                    finalQuery = query(baseQuery, orderBy('referralAppliedAt', 'desc'), endBefore(firstDoc), limitToLast(PAGE_SIZE));
                } else {
                    finalQuery = query(baseQuery, orderBy('createdAt', 'desc'), endBefore(firstDoc), limitToLast(PAGE_SIZE));
                }
            } else { // reset
                newPage = 1;
                setPageHistory([{first: null, last: null}]);
                if (sortOrder === 'referred') {
                    finalQuery = query(baseQuery, orderBy('referralAppliedAt', 'desc'), limit(PAGE_SIZE));
                } else {
                    finalQuery = query(baseQuery, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
                }
            }

            const documentSnapshots = await getDocs(finalQuery);
            let userList = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnrichedUser));
            
            if (direction === 'prev' && page > 1) {
              setPageHistory(prev => prev.slice(0, -1));
            }

            if (userList.length > 0) {
                const referrerIds = [...new Set(userList.map(u => u.referredBy).filter(Boolean))] as string[];
                
                if (referrerIds.length > 0) {
                    const referrerProfiles = new Map<string, UserProfile>();
                    for (const referrerId of referrerIds) {
                        if (!referrerProfiles.has(referrerId)) {
                             const referrerDoc = await getDoc(doc(firestore, 'users', referrerId));
                            if (referrerDoc.exists()) {
                                referrerProfiles.set(referrerId, referrerDoc.data() as UserProfile);
                            }
                        }
                    }
                    userList = userList.map(user => {
                        if (user.referredBy) {
                            const referrer = referrerProfiles.get(user.referredBy);
                            return { ...user, referrerProfileCode: referrer?.profileCode };
                        }
                        return user;
                    });
                }
            }

            setUsers(userList);
            
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
            console.error("Error fetching users: ", error);
            setIsLastPage(true);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, page, pageHistory, sortOrder]);
    
    useEffect(() => {
        fetchUsers('reset');
    }, [sortOrder]);

    const handleSortChange = (value: SortOrder) => {
        setSortOrder(value);
    };

    const startIndex = (page - 1) * PAGE_SIZE;

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>All Registered Users</CardTitle>
                            <CardDescription>A list of all users in the system.</CardDescription>
                            <div className="mt-4 flex flex-col gap-2 text-lg font-semibold text-primary">
                                <div className="flex items-center">
                                    <UserPlus className="h-5 w-5 mr-2" />
                                    <span>Today's Registrations: {todaysRegistrations}</span>
                                </div>
                                <div className="flex items-center">
                                    <Users className="h-5 w-5 mr-2" />
                                    <span>Total Users: {totalUsers}</span>
                                </div>
                                <div className="flex items-center">
                                    <Share2 className="h-5 w-5 mr-2" />
                                    <span>Today's Referrals: {todaysReferrals}</span>
                                </div>
                            </div>
                        </div>
                         <div className="flex flex-col items-end gap-2">
                             <Select onValueChange={handleSortChange} defaultValue={sortOrder}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt">Newest First</SelectItem>
                                    <SelectItem value="referred">Referred Users</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchUsers('prev')}
                                    disabled={page === 1 || isLoading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchUsers('next')}
                                    disabled={isLastPage || isLoading}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading && users.length === 0 ? (
                        <div className="flex items-center justify-center p-8 h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex items-center justify-center p-8 h-64">
                           <p className="text-muted-foreground">No users found for this filter.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {users.map((user, index) => {
                                let displayDate, dateLabel;
                                if (sortOrder === 'referred' && user.referralAppliedAt) {
                                    dateLabel = "Referred";
                                    displayDate = formatDistanceToNow(new Date((user.referralAppliedAt as any).seconds * 1000), { addSuffix: true });
                                } else {
                                    const registrationDate = user.createdAt instanceof Timestamp ? user.createdAt.toDate() : new Date((user.createdAt as any).seconds * 1000);
                                    dateLabel = "Joined";
                                    displayDate = formatDistanceToNow(registrationDate, { addSuffix: true });
                                }

                                return(
                                <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono text-sm text-muted-foreground w-8 text-center">{startIndex + index + 1}.</div>
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-semibold hover:underline">
                                                    {user.fullName}
                                                </Link>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Hash className="h-3 w-3" /> {user.profileCode}
                                                </p>
                                                {sortOrder === 'referred' && user.referredByName && (
                                                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                                                      <UserCheck className="h-3 w-3" /> 
                                                      Referred by:{' '}
                                                      <Link
                                                          href={`/admin/find-user?profileCode=${user.referrerProfileCode}`}
                                                          className="font-semibold hover:underline"
                                                          onClick={(e) => e.stopPropagation()}
                                                      >
                                                        {user.referredByName}
                                                      </Link>
                                                  </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right self-start sm:self-center ml-auto pl-4">
                                            <p className="text-sm font-medium">{displayDate}</p>
                                            <p className="text-xs text-muted-foreground">{dateLabel}</p>
                                        </div>
                                    </div>
                                </Card>
                            )})}
                        </div>
                    )}
                    {isLoading && users.length > 0 && (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

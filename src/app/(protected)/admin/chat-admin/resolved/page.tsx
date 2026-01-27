
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Inbox } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

export default function ResolvedChatsPage() {
    const firestore = useFirestore();

    const resolvedChatsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('chatStatus', '==', 'resolved')
        );
    }, [firestore]);

    const { data: users, isLoading } = useCollection<UserProfile>(resolvedChatsQuery);

    const sortedUsers = useMemo(() => {
        if (!users) return [];
        return users.sort((a, b) => {
            const lastMessageA = a.chat?.[a.chat.length - 1]?.timestamp?.toMillis() || 0;
            const lastMessageB = b.chat?.[b.chat.length - 1]?.timestamp?.toMillis() || 0;
            return lastMessageB - lastMessageA;
        });
    }, [users]);
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center app-background"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="h-screen flex flex-col app-background text-white">
            <header className="p-4 border-b border-purple-400/20 bg-slate-900/50 backdrop-blur-sm flex items-center gap-4">
                 <Button asChild variant="ghost" size="icon">
                    <Link href="/admin/chat-admin">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold">Resolved Chats</h1>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
                {sortedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg h-full">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Resolved Chats</h3>
                        <p className="text-sm text-muted-foreground">There are no chats that have been marked as resolved.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedUsers.map(user => (
                             <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                                <Link href={`/admin/chat-admin?userId=${user.id}`} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
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
                                        <p className="text-xs text-muted-foreground">
                                           Last message: {user.chat && user.chat.length > 0
                                                ? formatDistanceToNow(user.chat[user.chat.length - 1].timestamp.toDate(), { addSuffix: true })
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </Link>
                             </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

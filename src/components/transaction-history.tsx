

'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowUpRight, ArrowDownLeft, History, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function TransactionHistory() {
  const { userProfile } = useAuth();
  const firestore = useFirestore();

  const sentQuery = useMemoFirebase(() => {
    if (!userProfile) return null;
    return query(
      collection(firestore, 'transactions'),
      where('senderId', '==', userProfile.id)
    );
  }, [userProfile, firestore]);
  
  const receivedQuery = useMemoFirebase(() => {
    if (!userProfile) return null;
    return query(
      collection(firestore, 'transactions'),
      where('receiverId', '==', userProfile.id)
    );
  }, [userProfile, firestore]);

  const { data: sentTransactions, isLoading: isLoadingSent } = useCollection<Transaction>(sentQuery);
  const { data: receivedTransactions, isLoading: isLoadingReceived } = useCollection<Transaction>(receivedQuery);

  const transactions = useMemo(() => {
    const allTransactions = [...(sentTransactions || []), ...(receivedTransactions || [])];
    const uniqueTransactions = Array.from(new Map(allTransactions.map(t => [t.id, t])).values());
    return uniqueTransactions;
  }, [sentTransactions, receivedTransactions]);

  const isLoading = isLoadingSent || isLoadingReceived;
  
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.sort((a, b) => {
        const timeA = a.completedAt?.toMillis() ?? a.createdAt.toMillis();
        const timeB = b.completedAt?.toMillis() ?? b.createdAt.toMillis();
        return timeB - timeA;
    });
  }, [transactions]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sortedTransactions || sortedTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
        <History className="h-12 w-12 text-muted-foreground" />
        <h3 className="font-semibold">No Transaction History</h3>
        <p className="text-sm text-muted-foreground">You have not sent or received any coins yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
      {sortedTransactions.map((tx) => {
        const isSender = tx.senderId === userProfile?.id;
        const otherPartyName = isSender ? tx.receiverName : tx.senderName;
        const isCompleted = tx.status === 'completed';
        const isPending = tx.status === 'pending';

        return (
          <Card key={tx.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {isPending ? (
                    <Clock className="h-6 w-6 text-yellow-500" />
                ) : isCompleted ? (
                 isSender ? (
                    <ArrowUpRight className="h-6 w-6 text-red-500" />
                 ) : (
                    <ArrowDownLeft className="h-6 w-6 text-green-500" />
                 )
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="grid gap-1">
                   <p className="text-sm text-muted-foreground">
                    {isSender ? 'Sent to' : 'Received from'} <span className="font-semibold text-foreground">{otherPartyName}</span>
                  </p>
                  <p className={cn("font-bold text-lg", 
                      isPending ? 'text-yellow-500' : 
                      !isCompleted ? 'text-muted-foreground' : 
                      isSender ? 'text-red-500' : 'text-green-500'
                  )}>
                    {isSender ? '-' : '+'} {tx.amount} BLIT {isPending ? '(Pending)' : !isCompleted ? `(${tx.status})` : ''}
                  </p>
                   <p className="text-xs text-muted-foreground">
                    {tx.completedAt ? formatDistanceToNow(tx.completedAt.toDate(), { addSuffix: true }) : formatDistanceToNow(tx.createdAt.toDate(), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

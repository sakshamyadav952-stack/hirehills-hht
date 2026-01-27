
'use client';

// This hook is no longer used and can be removed in a future refactor.
// The logic has been moved directly into the AuthProvider for better real-time updates.

import { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, documentId } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function useReferrals(userIds: string[] | undefined) {
  const firestore = useFirestore();

  const referralsQueries = useMemo(() => {
    if (!firestore || !userIds || userIds.length === 0) return [];

    // Firestore 'in' queries are limited to 30 items in the array.
    // We need to chunk the userIds array into arrays of 30 or less.
    const chunks: string[][] = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    // Create a query for each chunk.
    return chunks.map(chunk =>
      query(collection(firestore, 'users'), where(documentId(), 'in', chunk))
    );
  // We stringify the userIds to ensure the memoization works correctly when the array content changes.
  }, [firestore, JSON.stringify(userIds)]);


  // useCollection can accept an array of queries.
  const { data, isLoading, error } = useCollection<UserProfile>(referralsQueries);

  const referralsWithStatus = useMemo(() => {
    if (!data) return [];
    return data.map(referral => ({
      ...referral,
      status: referral.sessionEndTime && referral.sessionEndTime > Date.now() ? 'Active' : 'Inactive'
    }));
  }, [data]);
  
  return { 
    referrals: referralsWithStatus,
    isLoading, 
    error 
  };
}

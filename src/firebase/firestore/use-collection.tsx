

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

type QueryType<T> = (CollectionReference<T> | Query<T>) & { __memo?: boolean };

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and arrays of queries.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {QueryType<DocumentData> | QueryType<DocumentData>[] | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query, or an array of them. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: QueryType<DocumentData> | QueryType<DocumentData>[] | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const queriesKey = useMemo(() => {
    if (!memoizedTargetRefOrQuery) return '';
    const queries = Array.isArray(memoizedTargetRefOrQuery) ? memoizedTargetRefOrQuery : [memoizedTargetRefOrQuery];
    // Filter out null/undefined queries and create a stable key
    return queries
      .map(q => (q as InternalQuery)?._query?.path?.canonicalString() ?? (q as CollectionReference)?.path)
      .filter(Boolean)
      .join(',');
  }, [memoizedTargetRefOrQuery]);


  useEffect(() => {
    // Strengthened guard clause: If the memoized target is null/undefined, do nothing.
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const queries = (Array.isArray(memoizedTargetRefOrQuery) ? memoizedTargetRefOrQuery : [memoizedTargetRefOrQuery])
      .filter(q => q != null) as QueryType<DocumentData>[];

    // If, after filtering, there are no valid queries, stop and set a safe state.
    if (queries.length === 0) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];
    const allData: { [queryIndex: number]: ResultItemType[] } = {};
    let queryCount = queries.length;
    let completedCount = 0;
    
    queries.forEach((query, index) => {
        if (!query.__memo) {
            console.warn('A query passed to useCollection was not properly memoized using useMemoFirebase. This can lead to performance issues.', query);
        }

        const unsubscribe = onSnapshot(
            query,
            (snapshot: QuerySnapshot<DocumentData>) => {
                const results: ResultItemType[] = [];
                snapshot.forEach(doc => {
                    results.push({ ...(doc.data() as T), id: doc.id });
                });
                
                allData[index] = results;

                // Combine data from all listeners
                const combinedData = Object.values(allData).flat();
                
                // Use a Map to remove duplicates by ID
                const uniqueData = Array.from(new Map(combinedData.map(item => [item.id, item])).values());
                
                setData(prevData => {
                    if (JSON.stringify(prevData) === JSON.stringify(uniqueData)) {
                      return prevData;
                    }
                    return uniqueData;
                  });
                setError(null);
                completedCount++;
                if (completedCount === queryCount) {
                  setIsLoading(false);
                }
            },
            async (error: FirestoreError) => {
                console.error("Firestore onSnapshot error:", error);
                const path: string = query.type === 'collection'
                    ? (query as CollectionReference).path
                    : (query as unknown as InternalQuery)._query.path.canonicalString();

                const contextualError = new FirestorePermissionError({
                    operation: 'list',
                    path,
                });

                setError(contextualError);
                setData(null);
                setIsLoading(false);
                errorEmitter.emit('permission-error', contextualError);
                
                unsubscribes.forEach(unsub => unsub());
            }
        );
        unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [queriesKey]); 

  return { data, isLoading, error };
}

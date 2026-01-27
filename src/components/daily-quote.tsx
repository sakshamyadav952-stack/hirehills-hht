
'use client';

import { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { quotes } from '@/lib/quotes';
import { Skeleton } from './ui/skeleton';

type CachedQuoteInfo = {
  index: number;
  date: string;
};

export function DailyQuote() {
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getQuoteForDay = () => {
      setLoading(true);
      const cachedInfoItem = localStorage.getItem('dailyQuoteInfo');
      const now = new Date();
      const today = now.toDateString();

      let currentQuoteIndex = 0;

      if (cachedInfoItem) {
        const { index, date } = JSON.parse(cachedInfoItem) as CachedQuoteInfo;
        
        // If it's still the same day, use the same quote
        if (date === today) {
          currentQuoteIndex = index;
        } else {
          // It's a new day, get the next quote
          currentQuoteIndex = (index + 1) % quotes.length;
        }
      } else {
        // No cache, start from a random quote
        currentQuoteIndex = Math.floor(Math.random() * quotes.length);
      }
      
      const newQuote = quotes[currentQuoteIndex];
      const newCachedInfo: CachedQuoteInfo = { index: currentQuoteIndex, date: today };
      localStorage.setItem('dailyQuoteInfo', JSON.stringify(newCachedInfo));
      
      setDailyQuote(newQuote);
      setLoading(false);
    };

    getQuoteForDay();
  }, []);

  return (
    <>
      <CardHeader className="p-0 mb-4">
        <CardTitle>Quote of the Day</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
           <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/4 ml-auto" />
          </div>
        ) : dailyQuote ? (
          <>
            <blockquote className="text-lg leading-snug lg:text-xl lg:leading-normal">
              “{dailyQuote.text}”
            </blockquote>
            <p className="mt-4 text-right text-md text-muted-foreground">— {dailyQuote.author}</p>
          </>
        ) : (
            <p>Could not load the quote at the moment.</p>
        )}
      </CardContent>
    </>
  );
}

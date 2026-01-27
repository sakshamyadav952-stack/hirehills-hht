'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
      <div className="space-y-4">
        <TriangleAlert className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Page Not Found
        </h1>
        <p className="text-muted-foreground">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="mailto:siggilence@gmail.com">Contact Support</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

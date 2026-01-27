'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function AssistantPage() {
    const router = useRouter();
    // This page is now a placeholder. The chat functionality is in the AppLayout.
    
    return (
    <>
      <div className="app-background min-h-screen">
        <header className="flex items-center gap-4 p-4 border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Sparkles className="h-6 w-6 text-cyan-300" />
          <h1 className="text-xl font-bold text-white">Blistree Assistant</h1>
        </header>

        <div className="p-6 text-center text-white">
            <h2 className="text-2xl font-bold">Assistant Page</h2>
            <p className="text-muted-foreground mt-2">The assistant can now be accessed directly from the sidebar on any page.</p>
        </div>
      </div>
    </>
  );
}

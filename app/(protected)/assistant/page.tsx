'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function AssistantPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    
    // Redirect logic to prevent direct access if needed, or display a message.
    // For now, this page can serve as a placeholder or be removed from navigation.
    
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
            <h2 className="text-2xl font-bold">Welcome to the Assistant Page</h2>
            <p className="text-muted-foreground mt-2">The assistant can now be accessed from the sidebar on any page.</p>
        </div>
      </div>
    </>
  );
}

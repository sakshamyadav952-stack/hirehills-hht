

'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Coins, User, Clock, Hourglass, Loader2, Star, UserCheck, X, Fingerprint, Inbox, Pyramid, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { KuberRequest, UserProfile, KuberBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { KuberBlockItem } from '@/components/kuber-block-item';


function FBlocCard({ kuberBlocks }: { kuberBlocks: KuberBlock[] | undefined }) {
  const [cumulativeTBloc, setCumulativeTBloc] = useState(0);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!kuberBlocks || kuberBlocks.length === 0) {
      setCumulativeTBloc(0);
      return;
    }

    const tBlocRatePerMs = 0.25 / (1000 * 60 * 60);

    const animate = () => {
      const now = Date.now();
      let total = 0;

      kuberBlocks.forEach(block => {
        // Main block's total points calculation
        const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
        const durationHours = durationMs / (1000 * 60 * 60);
        const totalKuberPoints = durationHours * 0.25;
        
        // t-bloc's current points calculation
        const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
        const currentSimulatedPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);
        
        total += currentSimulatedPoints;
      });

      setCumulativeTBloc(total);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [kuberBlocks]);

  return (
    <Card className="w-full bg-gradient-to-br from-indigo-900/50 via-slate-900 to-indigo-900/30 border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-bold text-indigo-300 tracking-wider flex items-center justify-center gap-2">
            <Pyramid className="h-5 w-5" />
            f-bloc
        </CardTitle>
        <CardDescription className="text-indigo-200/80 text-xs">
          Cumulative Network Activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-mono font-bold text-center text-white">
          {cumulativeTBloc.toFixed(4)}
        </p>
      </CardContent>
    </Card>
  );
}

function GBoxCard({ kuberBlocks }: { kuberBlocks: KuberBlock[] | undefined }) {
  const totalPoints = useMemo(() => {
    if (!kuberBlocks || kuberBlocks.length === 0) {
      return 0;
    }

    return kuberBlocks.reduce((sum, block) => {
      const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
      const durationHours = durationMs / (1000 * 60 * 60);
      const totalKuberPoints = durationHours * 0.25;
      return sum + totalKuberPoints;
    }, 0);
  }, [kuberBlocks]);

  return (
    <Card className="w-full bg-gradient-to-br from-green-900/50 via-slate-900 to-green-900/30 border-2 border-green-500 shadow-[0_0_20px_rgba(74,222,128,0.4)]">
      <CardHeader className="text-center">
        <CardTitle className="text-lg font-bold text-green-300 tracking-wider flex items-center justify-center gap-2">
          <Coins className="h-5 w-5" />
          g-box
        </CardTitle>
        <CardDescription className="text-green-200/80 text-xs">
          Total Potential Points
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-mono font-bold text-center text-white">
          {totalPoints.toFixed(4)}
        </p>
      </CardContent>
    </Card>
  );
}


function PendingKuberRequests() {
    const { userProfile, respondToKuberRequest } = useAuth();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleResponse = async (request: KuberRequest, approve: boolean) => {
        setProcessingId(request.id);
        await respondToKuberRequest(request);
        setProcessingId(null);
    };

    const pendingRequests = userProfile?.kuberApprovalRequests || [];
    
    if (pendingRequests.length === 0) {
        return null;
    }

    return (
        <Card className="w-full max-w-2xl mx-auto mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                    <UserCheck className="h-6 w-6" />
                    Pending Kuber Requests
                </CardTitle>
                <CardDescription>
                    Approve these requests to log them in your Kuber history.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {pendingRequests.map(request => (
                    <div key={request.id} className="p-4 border rounded-lg bg-slate-800/50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                             <div className="flex items-center gap-3">
                                  <User className="h-5 w-5 text-muted-foreground" />
                                  <span className="font-semibold">{request.userName}</span>
                            </div>
                            <div className="flex items-center gap-2 self-end">
                                <Button size="sm" variant="destructive" onClick={() => handleResponse(request, false)} disabled={!!processingId}>
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => handleResponse(request, true)} disabled={!!processingId}>
                                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function KuberPage() {
  const { userProfile, loading, clearKuberSessionLogs } = useAuth();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearLogs = async () => {
    setIsClearing(true);
    await clearKuberSessionLogs();
    setIsClearing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const isSessionActive = userProfile?.sessionEndTime && Date.now() < userProfile.sessionEndTime;

  return (
    <div className="container mx-auto py-10">
        <PendingKuberRequests />
        
        <Tabs defaultValue="session-log" className="w-full max-w-2xl mx-auto mt-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="session-log">Session Log</TabsTrigger>
                <TabsTrigger value="ids">IDs</TabsTrigger>
                <TabsTrigger value="t-bloc">t-bloc</TabsTrigger>
            </TabsList>
            <TabsContent value="session-log">
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <FBlocCard kuberBlocks={userProfile?.kuberBlocks} />
                    <GBoxCard kuberBlocks={userProfile?.kuberBlocks} />
                </div>
                <Card className="mt-6">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Coins className="h-6 w-6 text-primary" />
                                    Kuber Session Log
                                </CardTitle>
                                <CardDescription>
                                    A log of referral snapshots captured at the start of each of your mining sessions.
                                </CardDescription>
                            </div>
                            {userProfile?.kuberBlocks && userProfile.kuberBlocks.length > 0 && !isSessionActive && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" disabled={isClearing}>
                                            {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            Clear
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-amber-300">Clear Session Logs?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-amber-200/80">
                                                This will permanently delete all logs from your session history. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClearLogs}>
                                                Confirm
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {userProfile?.kuberBlocks && userProfile.kuberBlocks.length > 0 ? (
                        userProfile.kuberBlocks
                          .sort((a, b) => b.userSessionStartTime - a.userSessionStartTime)
                          .map(block => (
                            <div key={block.id} className="space-y-2">
                                <KuberBlockItem block={block} />
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">Start a mining session while your referrals are active to see snapshots here.</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="ids">
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Fingerprint className="h-6 w-6 text-primary" />
                            Processed Request IDs
                        </CardTitle>
                        <CardDescription>
                            A log of the latest Kuber request IDs processed from your referrals.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {userProfile?.kuberIds && userProfile.kuberIds.length > 0 ? (
                           <div className="space-y-2">
                                {userProfile.kuberIds.map(item => (
                                    <div key={item.referralId} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
                                        <span className="font-semibold">{item.referralName}</span>
                                        <span className="font-mono text-xs text-muted-foreground">{item.lastRequestId}</span>
                                    </div>
                                ))}
                           </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg h-full">
                                <Inbox className="h-12 w-12 text-muted-foreground" />
                                <h3 className="font-semibold">No Processed IDs</h3>
                                <p className="text-sm text-muted-foreground">No Kuber requests have been automatically processed yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="t-bloc">
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Coins className="h-6 w-6 text-primary" />
                            T-Bloc
                        </CardTitle>
                        <CardDescription>
                            This section is for T-Bloc functionality.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">T-Bloc content will be here.</p>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}



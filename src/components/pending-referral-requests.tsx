

'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2, Check, X, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export function PendingReferralRequests() {
  const { pendingReferralRequests, referralsLoading, respondToReferralRequest } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResponse = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId);
    try {
      await respondToReferralRequest(requestId, approve);
    } catch (error) {
      // Error is handled by toast in the auth hook
    } finally {
      setProcessingId(null);
    }
  };

  if (referralsLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!pendingReferralRequests || pendingReferralRequests.length === 0) {
    return (
        <div className="text-center p-12 border-2 border-dashed border-cyan-400/20 rounded-lg">
            <Inbox className="mx-auto h-12 w-12 text-cyan-400/50" />
            <h3 className="mt-4 text-lg font-semibold">No Pending Requests</h3>
            <p className="mt-1 text-sm text-muted-foreground">You have no new referral requests to review.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingReferralRequests.map((request) => (
        <div key={request.id} className="futuristic-card-bg-secondary p-4 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-cyan-400/30">
              {request.requesterProfileImageUrl && <AvatarImage src={request.requesterProfileImageUrl} alt={request.requesterName} />}
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{request.requesterName}</div>
              <div className="text-xs text-muted-foreground">
                Requested {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="icon" 
              variant="outline" 
              onClick={() => handleResponse(request.id, false)}
              disabled={!!processingId}
              className="border-red-400/50 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              onClick={() => handleResponse(request.id, true)}
              disabled={!!processingId}
               className="border-green-400/50 bg-green-500/10 text-green-300 hover:bg-green-500/20 hover:text-green-200"
            >
              {processingId === request.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}


'use client';

import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, DollarSign, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { SecondLevelPromoterReward } from '@/lib/types';

export default function PromoterDashboardPage() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!userProfile || !userProfile.isPromoter) {
     return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>You do not have permission to view this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const promoterRewards = userProfile.promoterRewards || [];
  const promoterReferralCount = userProfile.promoterReferralCount || 0;
  const secondLevelRewards = userProfile.secondLevelPromoterRewards 
    ? Object.values(userProfile.secondLevelPromoterRewards) 
    : [];
  
  const totalDirectUsdt = promoterRewards.reduce((sum, reward) => sum + reward.usdtAmount, 0);
  const totalSecondLevelUsdt = secondLevelRewards.reduce((sum, reward) => sum + reward.usdtAmount, 0);
  const totalUsdt = totalDirectUsdt + totalSecondLevelUsdt;

  const sortedRewards = [...promoterRewards].sort((a, b) => {
    const timeA = a.timestamp?.seconds || 0;
    const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });
  
  const sortedSecondLevelRewards = [...secondLevelRewards].sort((a,b) => b.usdtAmount - a.usdtAmount);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Promoter Dashboard</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total USDT Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUsdt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From direct and indirect referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Promoter Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoterReferralCount}</div>
            <p className="text-xs text-muted-foreground">Users who joined via your code</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>List of users you have referred and the USDT earned from each.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedRewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>You haven't referred anyone for the promoter program yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>{reward.referralName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{reward.referralName}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reward.timestamp.seconds * 1000), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-400">+${reward.usdtAmount.toFixed(2)}</p>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>From Your Referrals' Network</CardTitle>
          <CardDescription>USDT earned when your referrals bring in new users.</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSecondLevelRewards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No earnings from your referrals' network yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSecondLevelRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>{reward.directReferralName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{reward.directReferralName}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-400">+${reward.usdtAmount.toFixed(2)}</p>
                    </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

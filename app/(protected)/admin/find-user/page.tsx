
'use client';

import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, User, Mail, Phone, Calendar, PlusCircle, MinusCircle, Banknote, Users, Trash2, Globe, Clapperboard, Zap, Play, Coins, Smartphone, Network, ShieldAlert, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, documentId, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { UserProfile, AdWatchEvent, DailyAdCoin } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow, subHours } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LiveReportCard } from '@/components/live-report-card';
import { useSearchParams } from 'next/navigation';
import { FacebookIcon, XIcon } from '@/components/icons/social-icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';


const findUserSchema = z.object({
  searchQuery: z.string().min(1, 'Search field cannot be empty.'),
});
type FindUserFormValues = z.infer<typeof findUserSchema>;


function ModifyCoinsCard({ user, onUpdate }: { user: UserProfile, onUpdate: () => void }) {
    const { adminUpdateUserCoins } = useAuth();
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdateCoins = async (operation: 'increase' | 'decrease') => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('Please enter a valid positive amount.');
            return;
        }

        setIsSubmitting(true);
        const amountToUpdate = operation === 'increase' ? numericAmount : -numericAmount;
        
        try {
            await adminUpdateUserCoins(user.id, amountToUpdate);
            onUpdate(); // Trigger a re-fetch of the user data
            setAmount('');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Modify Coins</CardTitle>
                <CardDescription>Increase or decrease the user's coin balance.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="e.g., 100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleUpdateCoins('decrease')}
                            disabled={isSubmitting || !amount}
                            className="w-full"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
                            <span className="ml-2">Decrease</span>
                        </Button>
                        <Button
                            onClick={() => handleUpdateCoins('increase')}
                            disabled={isSubmitting || !amount}
                            className="w-full"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                             <span className="ml-2">Increase</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AdWatchHistoryCard({ user }: { user: UserProfile }) {
    const sortedHistory = useMemo(() => {
        return user.adWatchHistory?.sort((a, b) => b.timestamp - a.timestamp) || [];
    }, [user.adWatchHistory]);

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Ad Watch History</CardTitle>
                <CardDescription>Ads watched in the current or last session.</CardDescription>
            </CardHeader>
            <CardContent>
                {sortedHistory.length > 0 ? (
                    <div className="space-y-4">
                        {sortedHistory.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Clapperboard className="h-5 w-5 text-primary" />
                                    <div>
                                        <p className="font-medium">{event.element}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center p-4">No ad watch events recorded for this session.</p>
                )}
            </CardContent>
        </Card>
    );
}

type ConflictingAccount = UserProfile & { conflictType: 'IP' | 'Device' | 'Both' };

function UserDetails({ user, onUpdate, referrals, referralsLoading, conflictingAccounts, onConflictingAccountDeleted, referrerProfileCode }: { user: UserProfile, onUpdate: () => void, referrals: (UserProfile & { status: 'Active' | 'Inactive' })[], referralsLoading: boolean, conflictingAccounts: ConflictingAccount[], onConflictingAccountDeleted: (deletedUserId: string) => void, referrerProfileCode?: string | null }) {
    const { adminRemoveReferral, userProfile: adminProfile, adminSetFollowStatus, adminTerminateUserSession, adminStartUserSession, deleteAccount } = useAuth();
    const firestore = useFirestore();
    const registrationDate = user.createdAt instanceof Timestamp ? user.createdAt.toDate() : new Date((user.createdAt as any).seconds * 1000);
    const [liveCoins, setLiveCoins] = useState(user.minedCoins || 0);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [isTerminating, setIsTerminating] = useState(false);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [isDeletingConflict, setIsDeletingConflict] = useState<string | null>(null);
    const isAdmin = adminProfile?.isAdmin || adminProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
    const { toast } = useToast();

    const missedCoinsCollectedLast24h = useMemo(() => {
        const twentyFourHoursAgo = subHours(new Date(), 24).getTime();
        return user.dailyAdCoins?.filter(
            (coin) => coin.status === 'collected' && coin.collectedFromStatus === 'missed' && coin.collectedAt && coin.collectedAt > twentyFourHoursAgo
        ).length || 0;
    }, [user.dailyAdCoins]);


    const handleRemoveReferral = async (referralId: string) => {
        setIsRemoving(referralId);
        try {
            await adminRemoveReferral(user.id, referralId);
            onUpdate(); // Re-fetch user data to update the list
        } finally {
            setIsRemoving(null);
        }
    };
    
    const handleStatusChange = async (platform: 'facebook' | 'x', status: 'followed' | 'pending' | 'not-following') => {
        const newStatus = status === 'not-following' ? null : status;
        await adminSetFollowStatus(user.id, platform, newStatus);
        onUpdate();
    };

    const handleTerminateSession = async () => {
        setIsTerminating(true);
        try {
            await adminTerminateUserSession(user.id);
            onUpdate();
        } finally {
            setIsTerminating(false);
        }
    };
    
    const handleStartSession = async () => {
        setIsStartingSession(true);
        try {
            await adminStartUserSession(user.id);
            onUpdate();
        } finally {
            setIsStartingSession(false);
        }
    };

    const handleDeleteConflictingAccount = async (conflictUserId: string) => {
        setIsDeletingConflict(conflictUserId);
        try {
            const userToDeleteRef = doc(firestore, 'users', conflictUserId);
            await deleteDoc(userToDeleteRef);
            toast({
                title: 'Account Deleted',
                description: 'The conflicting account has been successfully deleted.',
            });
            onConflictingAccountDeleted(conflictUserId); // Notify parent to update the list
        } catch (error) {
            console.error("Error deleting conflicting account:", error);
            toast({
                title: 'Deletion Failed',
                description: 'Could not delete the conflicting account.',
                variant: 'destructive',
            });
        } finally {
            setIsDeletingConflict(null);
        }
    };

    const isSessionActive = user.sessionEndTime && Date.now() < user.sessionEndTime;


    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;

        const calculateLiveCoins = () => {
             if (user.sessionEndTime && Date.now() < user.sessionEndTime && user.miningStartTime) {
                const baseRate = user.baseMiningRate || 0.25;
                const boostRate = (user.miningRate2H || 0) + (user.miningRate4H || 0) + (user.miningRate8H || 0);
                const referralBonus = (user.referrals?.length || 0) * 0.1;
                const totalSessionMiningRate = baseRate + boostRate + referralBonus;
                const miningRatePerSecond = totalSessionMiningRate / 3600;
    
                interval = setInterval(() => {
                    const now = Date.now();
                    if (now < user.sessionEndTime!) {
                        const elapsedTimeSinceLastSaveMs = now - user.miningStartTime!;
                        const coinsEarnedThisSession = (elapsedTimeSinceLastSaveMs / 1000) * miningRatePerSecond;
                        setLiveCoins((user.minedCoins || 0) + coinsEarnedThisSession);
                    } else {
                        const totalElapsedMs = user.sessionEndTime! - user.miningStartTime!;
                        const coinsEarnedThisSession = (totalElapsedMs / 1000) * miningRatePerSecond;
                        setLiveCoins((user.minedCoins || 0) + coinsEarnedThisSession);
                        if (interval) clearInterval(interval);
                    }
                }, 1000);
            } else {
                setLiveCoins(user.minedCoins || 0);
            }
        }

        calculateLiveCoins();

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user]);

    return (
        <>
            <Card className="mt-6">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle>{user.fullName}</CardTitle>
                            <CardDescription>@{user.email?.split('@')[0]}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{user.mobileNumber}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{user.country || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm capitalize">{user.gender}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">Joined: {format(registrationDate, 'PPP')}</span>
                        </div>
                        {user.referredByName && (
                            <div className="flex items-center gap-3">
                                <UserCheck className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm">
                                    Referred by:{' '}
                                    {referrerProfileCode ? (
                                        <Link href={`/admin/find-user?profileCode=${referrerProfileCode}`} className="font-semibold hover:underline text-primary">
                                            {user.referredByName}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold">{user.referredByName}</span>
                                    )}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-3">
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm break-all font-mono">{user.deviceNames?.slice(-1)[0] || 'Not available'}</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <Network className="h-5 w-5 text-muted-foreground mt-1" />
                            <div className="flex flex-col gap-1">
                                {(user.ipAddresses && user.ipAddresses.length > 0) ? user.ipAddresses.map((ip, index) => (
                                    <span key={index} className="text-sm break-all font-mono">{ip}</span>
                                )) : <span className="text-sm font-mono">Not available</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Coins className="h-5 w-5 text-muted-foreground" />
                            <span className="font-bold text-lg">{liveCoins.toFixed(4)}</span>
                            <span className="text-sm text-muted-foreground">BLIT</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Coins className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">
                                Missed Coins Claimed (24h): <span className="font-bold">{missedCoinsCollectedLast24h}</span>
                            </span>
                        </div>
                    </div>
                     {isAdmin && (
                        <div className="mt-6 border-t pt-4">
                             {isSessionActive ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="w-full" disabled={isTerminating}>
                                            {isTerminating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                                            Terminate Session
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="text-amber-300">Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-amber-200/80">
                                                This will end the user's current mining session and calculate their earnings. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleTerminateSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Confirm Termination
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <Button onClick={handleStartSession} className="w-full" disabled={isStartingSession}>
                                    {isStartingSession ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                    Start Mining Session
                                </Button>
                             )}
                        </div>
                    )}
                </CardContent>
            </Card>
            
            {isAdmin && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Social Follow Status</CardTitle>
                        <CardDescription>Manage user's social media follow verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Facebook Status */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div className="flex items-center gap-3">
                                <FacebookIcon />
                                <span className="font-medium">Facebook</span>
                            </div>
                            <Select
                                value={user.followStatusFacebook || 'not-following'}
                                onValueChange={(value) => handleStatusChange('facebook', value as any)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-following">Not Following</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="followed">Following</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* X/Twitter Status */}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                            <div className="flex items-center gap-3">
                                <XIcon />
                                <span className="font-medium">X (Twitter)</span>
                            </div>
                             <Select
                                value={user.followStatusX || 'not-following'}
                                onValueChange={(value) => handleStatusChange('x', value as any)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="not-following">Not Following</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="followed">Following</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="mt-6">
                <LiveReportCard userProfile={user} />
            </div>
            
            {isAdmin && conflictingAccounts.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert /> Conflicting Accounts</CardTitle>
                        <CardDescription>These accounts share the same device or IP address as {user.fullName}.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {conflictingAccounts.map(conflictUser => (
                             <Card key={conflictUser.id} className="bg-destructive/10 border-destructive/50">
                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <Link href={`/admin/find-user?profileCode=${conflictUser.profileCode}`} className="flex items-center gap-3 flex-1 hover:bg-muted/50 rounded-lg -m-2 p-2">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={conflictUser.profileImageUrl} alt={conflictUser.fullName} />
                                            <AvatarFallback>{conflictUser.fullName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{conflictUser.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{conflictUser.email}</p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2 self-start sm:self-center">
                                        <Badge variant="destructive">{conflictUser.conflictType}</Badge>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={isDeletingConflict === conflictUser.id}>
                                                    {isDeletingConflict === conflictUser.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-amber-300">Delete Conflicting Account?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-amber-200/80">
                                                        This will permanently delete <strong>{conflictUser.fullName}</strong>. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteConflictingAccount(conflictUser.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        Confirm Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            )}

            {isAdmin && (
                <div className="mt-6">
                    <AdWatchHistoryCard user={user} />
                </div>
            )}

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Security Circle</CardTitle>
                    <CardDescription>Users referred by {user.fullName}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {referralsLoading ? (
                         <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : referrals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">This user has not referred anyone yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {referrals.map(ref => (
                                <div key={ref.id} className="flex items-center justify-between">
                                    <Link href={`/admin/find-user?profileCode=${ref.profileCode}`} className="flex items-center gap-3 hover:bg-muted/50 rounded-md -m-2 p-2 flex-1">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={ref.profileImageUrl} alt={ref.fullName} />
                                            <AvatarFallback>{ref.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{ref.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{ref.email}</p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={ref.status === 'Active' ? 'default' : 'secondary'} className={cn(ref.status === 'Active' && 'bg-green-500/80')}>{ref.status}</Badge>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={isRemoving === ref.id}>
                                                    {isRemoving === ref.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-amber-300">Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-amber-200/80">
                                                        This will remove <strong>{ref.fullName}</strong> from s referral list. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleRemoveReferral(ref.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                        Confirm Remove
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <ModifyCoinsCard user={user} onUpdate={onUpdate} />
        </>
    );
}

function FindUserComponent() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    
    const [isLoading, setIsLoading] = useState(false);
    const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
    const [userReferrals, setUserReferrals] = useState<(UserProfile & { status: 'Active' | 'Inactive' })[]>([]);
    const [referralsLoading, setReferralsLoading] = useState(false);
    const [conflictingAccounts, setConflictingAccounts] = useState<ConflictingAccount[]>([]);
    const [conflictsLoading, setConflictsLoading] = useState(false);
    const [referrerProfileCode, setReferrerProfileCode] = useState<string | null>(null);


    const form = useForm<FindUserFormValues>({
        resolver: zodResolver(findUserSchema),
        defaultValues: { searchQuery: '' },
    });

    const fetchConflictingAccounts = useCallback(async (user: UserProfile) => {
        if (!user || (!user.deviceNames?.length && !user.ipAddresses?.length)) {
            setConflictingAccounts([]);
            return;
        }
    
        setConflictsLoading(true);
        const conflictsMap: Map<string, ConflictingAccount> = new Map();
        const usersRef = collection(firestore, 'users');
    
        const processSnapshot = (snapshot: any, conflictSource: 'Device' | 'IP') => {
            snapshot.forEach((doc: any) => {
                if (doc.id === user.id) return;
    
                const existingConflict = conflictsMap.get(doc.id);
                if (existingConflict) {
                    if (existingConflict.conflictType !== conflictSource) {
                        existingConflict.conflictType = 'Both';
                    }
                } else {
                    conflictsMap.set(doc.id, {
                        id: doc.id,
                        ...doc.data(),
                        conflictType: conflictSource
                    } as ConflictingAccount);
                }
            });
        };
    
        if (user.deviceNames?.length) {
            const deviceQuery = query(usersRef, where('deviceNames', 'array-contains-any', user.deviceNames));
            const deviceSnapshot = await getDocs(deviceQuery);
            processSnapshot(deviceSnapshot, 'Device');
        }
    
        if (user.ipAddresses?.length) {
            const ipQuery = query(usersRef, where('ipAddresses', 'array-contains-any', user.ipAddresses));
            const ipSnapshot = await getDocs(ipQuery);
            processSnapshot(ipSnapshot, 'IP');
        }
    
        setConflictingAccounts(Array.from(conflictsMap.values()));
        setConflictsLoading(false);
    }, [firestore]);


    const onFindUser = useCallback(async (data: FindUserFormValues) => {
        setIsLoading(true);
        setFoundUser(null);
        setUserReferrals([]);
        setConflictingAccounts([]);
        setReferrerProfileCode(null);
        try {
            const { searchQuery } = data;
            
            let q;
            // The email field is in a private subcollection, so we can only query by profileCode
            if (searchQuery.includes('@')) {
                 toast({ title: 'Search by Profile Code', description: 'Please search for users by their 6-digit profile code.', variant: 'destructive' });
                 setIsLoading(false);
                 return;
            } else {
                q = query(collection(firestore, 'users'), where('profileCode', '==', searchQuery.toUpperCase()));
            }
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ title: 'User not found', description: 'No user found with that profile code.', variant: 'destructive' });
            } else {
                const userDoc = querySnapshot.docs[0];
                const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;

                // Fetch private contact info
                const privateContactRef = doc(firestore, 'users', userDoc.id, 'private', 'contact');
                const privateContactSnap = await getDoc(privateContactRef);
                if (privateContactSnap.exists()) {
                    const privateData = privateContactSnap.data();
                    userData.email = privateData.email;
                    userData.mobileNumber = privateData.mobileNumber;
                }

                if (userData.referredBy) {
                    const referrerDocRef = doc(firestore, 'users', userData.referredBy);
                    const referrerSnap = await getDoc(referrerDocRef);
                    if (referrerSnap.exists()) {
                        setReferrerProfileCode(referrerSnap.data().profileCode);
                    }
                }
                
                setFoundUser(userData);
                toast({ title: 'User Found!', description: `Displaying details for ${userData.fullName}.` });
                fetchConflictingAccounts(userData);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to search for user.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [firestore, toast, fetchConflictingAccounts]);
    
    useEffect(() => {
        const fetchReferrals = async () => {
            if (foundUser && foundUser.referrals && foundUser.referrals.length > 0) {
                setReferralsLoading(true);
                const referralUids = foundUser.referrals;
                const usersRef = collection(firestore, 'users');
                const chunks: string[][] = [];
                for (let i = 0; i < referralUids.length; i += 30) {
                    chunks.push(referralUids.slice(i, i + 30));
                }
                
                const referralsData: UserProfile[] = [];
                for (const chunk of chunks) {
                     if (chunk.length === 0) continue;
                     const referralQuery = query(usersRef, where(documentId(), 'in', chunk));
                     const referralSnapshot = await getDocs(referralQuery);
                     referralSnapshot.forEach(doc => referralsData.push({ id: doc.id, ...doc.data() } as UserProfile));
                }
                
                const referralsWithStatus = referralsData.map(ref => ({
                    ...ref,
                    status: ref.sessionEndTime && ref.sessionEndTime > Date.now() ? 'Active' : 'Inactive' as 'Active' | 'Inactive'
                }));

                setUserReferrals(referralsWithStatus);
                setReferralsLoading(false);
            } else {
                setUserReferrals([]);
            }
        };

        fetchReferrals();
    }, [foundUser, firestore]);

    const handleUserUpdate = async () => {
        if (foundUser) {
            onFindUser({ searchQuery: foundUser.profileCode });
        }
    };

    const handleConflictDeleted = (deletedUserId: string) => {
        setConflictingAccounts(prev => prev.filter(acc => acc.id !== deletedUserId));
    };
    
    useEffect(() => {
        const profileCode = searchParams.get('profileCode');
        if (profileCode) {
            form.setValue('searchQuery', profileCode);
            onFindUser({ searchQuery: profileCode });
        }
    }, [searchParams, form, onFindUser]);

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Find a User</CardTitle>
                    <CardDescription>Search for a user by their 6-digit profile code.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onFindUser)} className="flex items-start gap-2">
                            <FormField
                                control={form.control}
                                name="searchQuery"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Enter profile code" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                <span className="ml-2 hidden sm:inline">Find User</span>
                            </Button>
                        </form>
                    </Form>
                    {foundUser && <UserDetails user={foundUser} onUpdate={handleUserUpdate} referrals={userReferrals} referralsLoading={referralsLoading} conflictingAccounts={conflictingAccounts} onConflictingAccountDeleted={handleConflictDeleted} referrerProfileCode={referrerProfileCode} />}
                </CardContent>
            </Card>
        </div>
    );
}

export default function FindUserPage() {
    return (
        <Suspense fallback={<div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FindUserComponent />
        </Suspense>
    );
}
    

    

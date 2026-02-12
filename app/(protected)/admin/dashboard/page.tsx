
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, runTransaction, arrayUnion, query, where, getDocs, writeBatch, increment, getDoc, orderBy, Timestamp, documentId, limit, DocumentSnapshot, startAfter } from 'firebase/firestore';
import { Loader2, User, Shield, Inbox, Check, X, Coins, Award, Settings, MessageSquare, Send, Star, Banknote, Building2, UserCheck, Share2, AtSign, Smartphone, Gift, Save, FilePen, Search, Crown, Trash2, Trophy } from 'lucide-react';
import type { UserProfile, WithdrawalRequest, PendingTransfer, Transaction, Note, Review, AirdropConfig, TournamentConfig, PrizeTier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FacebookIcon, XIcon } from '@/components/icons/social-icons';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DatePicker } from '@/components/ui/date-picker';


const miningRateSchema = z.object({
  rate: z.coerce.number().positive({ message: "Rate must be a positive number." }),
});

function SetMiningRateForm() {
    const { setGlobalBaseMiningRate } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof miningRateSchema>>({
        resolver: zodResolver(miningRateSchema),
        defaultValues: { rate: 0.25 },
    });

    const onSubmit = async (data: z.infer<typeof miningRateSchema>) => {
        setIsSubmitting(true);
        try {
            await setGlobalBaseMiningRate(data.rate);
            form.reset({ rate: data.rate }); // Keep the new rate in the form
        } catch (error) {
            // Toast is handled in the auth hook
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Base Rate (tokens/hour)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 0.25" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Update Rate for All Users
                </Button>
            </form>
        </Form>
    );
}

const sessionDurationSchema = z.object({
  duration: z.coerce.number().int().positive({ message: "Duration must be a positive integer." }),
});

function SetSessionDurationForm() {
    const { setGlobalSessionDuration, getGlobalSessionDuration } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof sessionDurationSchema>>({
        resolver: zodResolver(sessionDurationSchema),
        defaultValues: { duration: 480 }, // Default to 8 hours (480 minutes)
    });
    
    useEffect(() => {
        getGlobalSessionDuration().then(duration => {
            if(duration) {
                form.reset({ duration });
            }
        });
    }, [getGlobalSessionDuration, form]);

    const onSubmit = async (data: z.infer<typeof sessionDurationSchema>) => {
        setIsSubmitting(true);
        try {
            await setGlobalSessionDuration(data.duration);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Session Duration (minutes)</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" placeholder="e.g., 480 for 8 hours" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Update Session Duration
                </Button>
            </form>
        </Form>
    );
}

const bonusSpinsSchema = z.object({
  spins: z.coerce.number().int().min(1, { message: "Must be at least 1." }),
});

function GrantBonusSpinsForm() {
    const { grantBonusSpins } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof bonusSpinsSchema>>({
        resolver: zodResolver(bonusSpinsSchema),
        defaultValues: { spins: 1 },
    });

    const onSubmit = async (data: z.infer<typeof bonusSpinsSchema>) => {
        setIsSubmitting(true);
        try {
            await grantBonusSpins(data.spins);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="spins"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Bonus Spins</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" placeholder="e.g., 1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                    Grant Spins to All Users
                </Button>
            </form>
        </Form>
    );
}


function TotalSupplyManager() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Set Global Base Mining Rate</CardTitle>
                    <CardDescription>Update the base mining rate for all users in the system. This action is irreversible for a session.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SetMiningRateForm />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Set Global Session Duration</CardTitle>
                    <CardDescription>Update the mining session duration for all users in minutes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SetSessionDurationForm />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Grant Bonus Spins</CardTitle>
                    <CardDescription>Give a specified number of bonus spins to all users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GrantBonusSpinsForm />
                </CardContent>
            </Card>
        </div>
    );
}

function AirdropManager() {
    const { updateAirdropConfig } = useAuth();
    const firestore = useFirestore();
    const [config, setConfig] = useState<Partial<AirdropConfig>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const configDocRef = doc(firestore, 'config', 'airdrop');
        const unsubscribe = onSnapshot(configDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as AirdropConfig;
                const expiryDate = data.expiryDate ? (data.expiryDate as Timestamp).toDate() : undefined;
                setConfig({
                    ...data,
                    expiryDate: expiryDate,
                    bonusDeadline: data.bonusDeadline ? (data.bonusDeadline as Timestamp).toDate() : undefined,
                });
            } else {
                setConfig({
                    headline: "Referral Airdrop",
                    tagline: "Don't miss this opportunity!",
                    referralLimit: 5,
                    rewardAmount: 30,
                    bonusReferralTarget: 3,
                    bonusReward: 70,
                    completionBonus: 120,
                    isActive: false
                })
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const handleUpdate = async (field: keyof AirdropConfig, value: any) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        if (field === 'isActive') {
            await updateAirdropConfig(newConfig);
        }
    };

    const handleSave = async () => {
        await updateAirdropConfig(config);
    };
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Airdrop Management</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Airdrop Management</CardTitle>
                <CardDescription>Control the referral airdrop event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input id="headline" value={config.headline || ''} onChange={(e) => handleUpdate('headline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input id="tagline" value={config.tagline || ''} onChange={(e) => handleUpdate('tagline', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="referralLimit">Airdrop Referral Limit</Label>
                        <Input id="referralLimit" type="number" value={config.referralLimit || ''} onChange={(e) => handleUpdate('referralLimit', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rewardAmount">Reward/Referral (BLIT)</Label>
                        <Input id="rewardAmount" type="number" value={config.rewardAmount || ''} onChange={(e) => handleUpdate('rewardAmount', Number(e.target.value))} />
                    </div>
                </div>

                <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2">Sub-task Bonus</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bonus Deadline</Label>
                            <DatePicker
                                date={config.bonusDeadline as Date}
                                onDateChange={(date) => handleUpdate('bonusDeadline', date)}
                                disabled={(date) => {
                                    const expiry = config.expiryDate instanceof Date ? config.expiryDate : new Date();
                                    return date > expiry;
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bonusReferralTarget">Referral Target</Label>
                            <Input id="bonusReferralTarget" type="number" value={config.bonusReferralTarget || ''} onChange={(e) => handleUpdate('bonusReferralTarget', Number(e.target.value))} />
                        </div>
                         <div className="space-y-2 col-span-2">
                            <Label htmlFor="bonusReward">Bonus Reward (BLIT)</Label>
                            <Input id="bonusReward" type="number" value={config.bonusReward || ''} onChange={(e) => handleUpdate('bonusReward', Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-md">
                     <h4 className="font-semibold mb-2">Completion Bonus</h4>
                     <div className="space-y-2">
                        <Label htmlFor="completionBonus">Airdrop Completion Bonus (BLIT)</Label>
                        <Input id="completionBonus" type="number" value={config.completionBonus || ''} onChange={(e) => handleUpdate('completionBonus', Number(e.target.value))} />
                    </div>
                </div>


                <div className="space-y-2">
                    <Label>Airdrop Expiry</Label>
                    <DatePicker 
                        date={config.expiryDate as Date} 
                        onDateChange={(date) => handleUpdate('expiryDate', date)}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                        }}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={() => handleUpdate('isActive', !config.isActive)}>
                        {config.isActive ? 'Deactivate Airdrop' : 'Launch Airdrop'}
                    </Button>
                    {config.isActive && (
                        <>
                            <Button variant="destructive" onClick={() => handleUpdate('isActive', false)}>Withdraw Airdrop</Button>
                            <Button variant="secondary">Pause Airdrop</Button>
                        </>
                    )}
                </div>
                <Button onClick={handleSave} className="w-full mt-4">
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                </Button>
            </CardContent>
        </Card>
    );
}

const PAGE_SIZE = 10;

function EligibleUsersManager({ showEnrollButton = false, forTournament = false }: { showEnrollButton?: boolean; forTournament?: boolean; }) {
    const firestore = useFirestore();
    const { makeUserPromoter, enrollUserInTournament } = useAuth();
    const [eligibleUsers, setEligibleUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [makingPromoter, setMakingPromoter] = useState<string | null>(null);
    const [enrolling, setEnrolling] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = useCallback(async (startAfterDoc: DocumentSnapshot | null = null, refresh: boolean = false) => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            let q;
            if (searchTerm) {
                q = query(collection(firestore, 'users'), where('profileCode', '==', searchTerm.toUpperCase()));
            } else {
                q = query(
                    collection(firestore, 'users'),
                    where('sessionEndTime', '>', Date.now()),
                    orderBy('sessionEndTime', 'desc'),
                    limit(PAGE_SIZE * 2) // Fetch more to have a better chance of filling the page
                );
                if (startAfterDoc && !refresh) {
                    q = query(q, startAfter(startAfterDoc));
                }
            }
            
            const documentSnapshots = await getDocs(q);
            
            let users = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));

            if (searchTerm) {
                 users = users.filter(user => user.minedCoins > 100 && (forTournament ? true : !user.isPromoter) && user.sessionEndTime && user.sessionEndTime > Date.now());
            } else {
                 users = users.filter(user => user.minedCoins > 100 && (forTournament ? true : !user.isPromoter));
            }
            
            setLastDoc(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setIsLastPage(searchTerm ? true : documentSnapshots.docs.length < (PAGE_SIZE * 2));

            if (refresh || searchTerm) {
                setEligibleUsers(users);
            } else {
                setEligibleUsers(prev => {
                    const all = [...prev, ...users];
                    return Array.from(new Map(all.map(item => [item.id, item])).values());
                });
            }

        } catch (error) {
            console.error("Error fetching eligible users:", error);
            setIsLastPage(true);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, searchTerm, forTournament]);

    const handleRefresh = useCallback(() => {
        setEligibleUsers([]);
        setLastDoc(null);
        setIsLastPage(false);
        fetchUsers(null, true);
    }, [fetchUsers]);
    
    useEffect(() => {
        handleRefresh();
    }, [handleRefresh, searchTerm]);
    
    const handleNext = () => {
        if (!isLastPage && lastDoc) {
            fetchUsers(lastDoc, false);
        }
    };

    const handleMakePromoter = async (userId: string) => {
        setMakingPromoter(userId);
        try {
            await makeUserPromoter(userId);
            handleRefresh(); // Refresh the list to remove the new promoter
        } finally {
            setMakingPromoter(null);
        }
    }

    const handleEnrollUser = async (userId: string) => {
        setEnrolling(userId);
        try {
            await enrollUserInTournament(userId);
            setEligibleUsers(prev => prev.filter(u => u.id !== userId));
        } finally {
            setEnrolling(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Eligible Users</CardTitle>
                <CardDescription>
                    Showing active users with over 100 BLIT who are not promoters.
                </CardDescription>
                <div className="flex gap-2 pt-4">
                    <Input 
                        placeholder="Search by profile code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && eligibleUsers.length === 0 ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : eligibleUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Eligible Users Found</h3>
                        <p className="text-sm text-muted-foreground">No matching users found.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {eligibleUsers.map(user => (
                            <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                               <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12"><AvatarImage src={user.profileImageUrl} alt={user.fullName} /><AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback></Avatar>
                                        <div>
                                            <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-semibold hover:underline">{user.fullName}</Link>
                                            <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Coins className="h-4 w-4 text-amber-400" />
                                                <span className="text-xs">{user.minedCoins.toFixed(2)} BLIT</span>
                                            </div>
                                        </div>
                                    </div>
                                    {showEnrollButton ? (
                                        <Button onClick={() => handleEnrollUser(user.id!)} disabled={enrolling === user.id} size="sm">
                                            {enrolling === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                            Enroll
                                        </Button>
                                    ) : (
                                        <Button onClick={() => handleMakePromoter(user.id!)} disabled={makingPromoter === user.id} size="sm">
                                            {makingPromoter === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                                            Make Promoter
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
            {eligibleUsers.length > 0 && !searchTerm && (
                <CardFooter className="flex justify-end">
                    <Button onClick={handleNext} disabled={isLoading || isLastPage}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isLastPage ? 'End of List' : 'Next'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

function PromotersManager() {
    const firestore = useFirestore();
    const [promoters, setPromoters] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPromoters = useCallback(async (startAfterDoc: DocumentSnapshot | null = null, refresh: boolean = false) => {
        if (!firestore) return;
        setIsLoading(true);

        try {
            let q;
            const baseQuery = query(collection(firestore, 'users'), where('isPromoter', '==', true));
            
            if (searchTerm) {
                q = query(baseQuery, where('profileCode', '==', searchTerm.toUpperCase()));
            } else {
                q = query(baseQuery, orderBy(documentId()), limit(PAGE_SIZE));
                if (startAfterDoc && !refresh) {
                    q = query(q, startAfter(startAfterDoc));
                }
            }

            const documentSnapshots = await getDocs(q);
            const users = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));

            setLastDoc(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setIsLastPage(searchTerm ? true : documentSnapshots.docs.length < PAGE_SIZE);

            if (refresh || searchTerm) {
                setPromoters(users);
            } else {
                setPromoters(prev => [...prev, ...users]);
            }

        } catch (error) {
            console.error("Error fetching promoters:", error);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, searchTerm]);

    useEffect(() => {
        fetchPromoters(null, true);
    }, [fetchPromoters]);

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchPromoters(null, true); // This now gets triggered on submit.
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Promoters</CardTitle>
                <CardDescription>Users with promoter privileges.</CardDescription>
                <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-4">
                    <Input 
                        placeholder="Search by profile code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button type="submit"><Search /></Button>
                </form>
            </CardHeader>
            <CardContent>
                 {isLoading && promoters.length === 0 ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : promoters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Promoters Found</h3>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {promoters.map(user => (
                            <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                               <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12"><AvatarImage src={user.profileImageUrl} alt={user.fullName} /><AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback></Avatar>
                                        <div>
                                            <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-semibold hover:underline">{user.fullName}</Link>
                                            <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 font-semibold">
                                        <Coins className="h-5 w-5 text-amber-400" />
                                        <span>{user.minedCoins.toFixed(4)} BLIT</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
             {promoters.length > 0 && !searchTerm && (
                <CardFooter className="flex justify-end">
                    <Button onClick={() => fetchPromoters(lastDoc)} disabled={isLoading || isLastPage}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isLastPage ? 'End of List' : 'Next'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

function TournamentManager() {
    const { updateTournamentConfig } = useAuth();
    const firestore = useFirestore();
    const [config, setConfig] = useState<Partial<TournamentConfig>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const configDocRef = doc(firestore, 'config', 'tournament');
        const unsubscribe = onSnapshot(configDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as TournamentConfig;
                const endDate = data.endDate ? (data.endDate as Timestamp).toDate() : undefined;
                setConfig({ ...data, endDate });
            } else {
                setConfig({
                    headline: "Referral Tournament",
                    tagline: "Refer friends to climb the leaderboard!",
                    prizeTiers: [{ id: '1', startRank: 1, endRank: 1, prize: 100 }],
                    isActive: false,
                });
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const handleUpdate = async (field: keyof TournamentConfig, value: any) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        if (field === 'isActive') {
            await updateTournamentConfig(newConfig);
        }
    };

    const addTier = () => {
        const newTiers = [...(config.prizeTiers || []), { id: Date.now().toString(), startRank: 0, endRank: 0, prize: 0 }];
        handleUpdate('prizeTiers', newTiers);
    };

    const removeTier = (id: string) => {
        const newTiers = config.prizeTiers?.filter(tier => tier.id !== id) || [];
        handleUpdate('prizeTiers', newTiers);
    };

    const updateTier = (id: string, field: keyof PrizeTier, value: any) => {
        const newTiers = config.prizeTiers?.map(tier => {
            if (tier.id === id) {
                return { ...tier, [field]: parseFloat(value) || 0 };
            }
            return tier;
        }) || [];
        handleUpdate('prizeTiers', newTiers);
    };

    const handleSave = async () => {
        await updateTournamentConfig(config);
    };

    if (isLoading) {
        return <Card><CardContent className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Set Tournament</CardTitle>
                <CardDescription>Configure and launch the referral tournament.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input id="headline" value={config.headline || ''} onChange={(e) => handleUpdate('headline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input id="tagline" value={config.tagline || ''} onChange={(e) => handleUpdate('tagline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>End Date</Label>
                    <DatePicker date={config.endDate as Date} onDateChange={(date) => handleUpdate('endDate', date)} />
                </div>

                <div className="space-y-4">
                    <Label>Prize Tiers (USDC)</Label>
                    {config.prizeTiers?.map((tier) => (
                        <div key={tier.id} className="flex items-center gap-2 p-2 border rounded-md">
                            <Input type="number" placeholder="Rank" value={tier.startRank} onChange={(e) => updateTier(tier.id, 'startRank', e.target.value)} className="w-20" />
                            <span>-</span>
                            <Input type="number" placeholder="Rank" value={tier.endRank} onChange={(e) => updateTier(tier.id, 'endRank', e.target.value)} className="w-20" />
                            <Input type="number" placeholder="Prize" value={tier.prize} onChange={(e) => updateTier(tier.id, 'prize', e.target.value)} className="flex-1" />
                            <Button variant="ghost" size="icon" onClick={() => removeTier(tier.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addTier}>Add Prize Tier</Button>
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={() => handleUpdate('isActive', !config.isActive)}>{config.isActive ? 'Deactivate' : 'Launch'}</Button>
                    <Button onClick={handleSave} className="w-full mt-4"><Save className="mr-2 h-4 w-4" />Save Configuration</Button>
                </div>
            </CardContent>
        </Card>
    );
}

function EnrolledUsersManager() {
    const firestore = useFirestore();
    const [enrolledUsers, setEnrolledUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
    const [isLastPage, setIsLastPage] = useState(false);
    const [tournamentId, setTournamentId] = useState<string | null>(null);

    const fetchUsers = useCallback(async (startAfterDoc: DocumentSnapshot | null = null) => {
        if (!firestore || !tournamentId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            let q = query(
                collection(firestore, 'users'),
                where('tournamentId', '==', tournamentId),
                orderBy('tournamentScore', 'desc'),
                limit(PAGE_SIZE)
            );
            if (startAfterDoc) {
                q = query(q, startAfter(startAfterDoc));
            }
            
            const documentSnapshots = await getDocs(q);
            const users = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));

            setLastDoc(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setIsLastPage(documentSnapshots.docs.length < PAGE_SIZE);

            if (startAfterDoc) {
                 setEnrolledUsers(prev => [...prev, ...users]);
            } else {
                setEnrolledUsers(users);
            }

        } catch (error) {
            console.error("Error fetching enrolled users:", error);
            setIsLastPage(true);
        } finally {
            setIsLoading(false);
        }
    }, [firestore, tournamentId]);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);
        const configDocRef = doc(firestore, 'config', 'tournament');
        getDoc(configDocRef).then(docSnap => {
            if (docSnap.exists() && docSnap.data().isActive) {
                setTournamentId(docSnap.id);
            } else {
                setTournamentId(null);
                setIsLoading(false);
            }
        });
    }, [firestore]);

    useEffect(() => {
        if (tournamentId) {
            fetchUsers(null);
        } else if (firestore) {
            setIsLoading(false);
        }
    }, [tournamentId, fetchUsers, firestore]);

    const handleNext = () => {
        if (!isLastPage && lastDoc) {
            fetchUsers(lastDoc);
        }
    };

    if (isLoading && enrolledUsers.length === 0) {
        return <Card><CardContent className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>;
    }

    if (!tournamentId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Enrolled Users</CardTitle>
                    <CardDescription>Users enrolled in the current tournament.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Active Tournament</h3>
                        <p className="text-sm text-muted-foreground">There is no active tournament to show enrolled users for.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Enrolled Users</CardTitle>
                <CardDescription>Users enrolled in the current tournament.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading && enrolledUsers.length === 0 ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : enrolledUsers.length === 0 ? (
                     <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Users Enrolled</h3>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {enrolledUsers.map(user => (
                            <Card key={user.id} className="p-4 hover:bg-muted/50 transition-colors">
                               <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12"><AvatarImage src={user.profileImageUrl} alt={user.fullName} /><AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback></Avatar>
                                        <div>
                                            <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-semibold hover:underline">{user.fullName}</Link>
                                            <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                                        </div>
                                    </div>
                                     <div className="flex items-center gap-2 font-semibold">
                                        <Trophy className="h-5 w-5 text-amber-400" />
                                        <span className="text-lg">{user.tournamentScore || 0}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </CardContent>
             {enrolledUsers.length > 0 && !isLastPage && (
                <CardFooter className="flex justify-end">
                    <Button onClick={handleNext} disabled={isLoading || isLastPage}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isLastPage ? 'End of List' : 'Next'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

function AdminDashboard() {
  const { userProfile, loading } = useAuth();
  
  const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
  
    if (loading) {
        return (
            <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
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

  return (
    <div className="container mx-auto py-10 pb-24">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <Tabs defaultValue="total-supply" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="total-supply">Total Supply</TabsTrigger>
          <TabsTrigger value="airdrop">Airdrop</TabsTrigger>
          <TabsTrigger value="user-management">UM</TabsTrigger>
          <TabsTrigger value="rt">RT</TabsTrigger>
        </TabsList>
         <TabsContent value="total-supply" className="mt-6">
            <TotalSupplyManager />
        </TabsContent>
        <TabsContent value="airdrop" className="mt-6">
            <AirdropManager />
        </TabsContent>
        <TabsContent value="user-management" className="mt-6">
            <Tabs defaultValue="eligible" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="eligible">Eligible</TabsTrigger>
                    <TabsTrigger value="promoters">Promoters</TabsTrigger>
                </TabsList>
                <TabsContent value="eligible" className="mt-6">
                    <EligibleUsersManager />
                </TabsContent>
                <TabsContent value="promoters" className="mt-6">
                    <PromotersManager />
                </TabsContent>
            </Tabs>
        </TabsContent>
        <TabsContent value="rt" className="mt-6">
            <Tabs defaultValue="tournament" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="tournament">Set Tournament</TabsTrigger>
                    <TabsTrigger value="eligible-rt">RT Eligible</TabsTrigger>
                    <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
                </TabsList>
                <TabsContent value="tournament" className="mt-6">
                    <TournamentManager />
                </TabsContent>
                <TabsContent value="eligible-rt" className="mt-6">
                    <EligibleUsersManager showEnrollButton={true} forTournament={true} />
                </TabsContent>
                <TabsContent value="enrolled" className="mt-6">
                    <EnrolledUsersManager />
                </TabsContent>
            </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}


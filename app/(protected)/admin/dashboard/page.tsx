
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, runTransaction, arrayUnion, query, where, getDocs, writeBatch, increment, getDoc, orderBy, Timestamp, documentId } from 'firebase/firestore';
import { Loader2, User, Shield, Inbox, Check, X, Coins, Award, Settings, MessageSquare, Send, Star, Banknote, Building2, UserCheck, Share2, AtSign, Smartphone, Gift, Save, FilePen } from 'lucide-react';
import type { UserProfile, WithdrawalRequest, PendingTransfer, Transaction, Note, Review, AirdropConfig } from '@/lib/types';
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

function FeedbacksManager() {
    const firestore = useFirestore();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);

        const fetchReviews = async () => {
            try {
                const reviewsQuery = query(collection(firestore, 'reviews'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(reviewsQuery);
                const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();

        const unsubscribe = onSnapshot(query(collection(firestore, 'reviews')), (snapshot) => {
            const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
            setReviews(fetchedReviews.sort((a,b) => {
                 if (a.createdAt && b.createdAt) {
                    const timeA = (a.createdAt as Timestamp).toMillis();
                    const timeB = (b.createdAt as Timestamp).toMillis();
                    return timeB - timeA;
                }
                return 0;
            }));
        });
        
        return () => unsubscribe();

    }, [firestore]);
    
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("h-5 w-5", i < rating ? "text-amber-400 fill-amber-400" : "text-gray-600")} />
        ));
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No Feedback Yet</h3>
                <p className="text-sm text-muted-foreground">No users have submitted feedback.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Feedbacks</CardTitle>
                <CardDescription>Review all feedback submitted by users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {reviews.map(review => {
                    const createdAtDate = review.createdAt ? (review.createdAt as Timestamp).toDate() : null;
                    return(
                    <Card key={review.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{review.userName}</CardTitle>
                                    <CardDescription>Profile Code: {review.profileCode}</CardDescription>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'Just now'}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-1">
                                {renderStars(review.rating)}
                            </div>
                            {review.feedback && (
                                <div className="p-3 rounded-md bg-muted/50 text-sm">
                                    <p className="font-semibold">Feedback:</p>
                                    <p className="whitespace-pre-wrap">{review.feedback}</p>
                                </div>
                            )}
                            {review.wasPlayStorePrompted && (
                                <div className="p-3 rounded-md bg-green-500/10 text-sm text-green-300 flex items-center gap-2">
                                    <Share2 className="h-4 w-4" />
                                    <span>User was prompted to rate on the Play Store.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )})}
            </CardContent>
        </Card>
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="total-supply">Total Supply</TabsTrigger>
          <TabsTrigger value="airdrop">Airdrop</TabsTrigger>
          <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
          <TabsTrigger value="daily-coins">Daily Coins</TabsTrigger>
        </TabsList>
         <TabsContent value="total-supply" className="mt-6">
            <TotalSupplyManager />
        </TabsContent>
        <TabsContent value="airdrop" className="mt-6">
            <AirdropManager />
        </TabsContent>
        <TabsContent value="feedbacks" className="mt-6">
            <FeedbacksManager />
        </TabsContent>
        <TabsContent value="daily-coins" className="mt-6">
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}

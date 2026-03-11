

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Settings, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';


const miningRateSchema = z.object({
  rate: z.coerce.number().positive({ message: "Rate must be a positive number." }),
});

function SetMiningRateForm() {
    const { setGlobalBaseMiningRate } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof miningRateSchema>>({
        resolver: zodResolver(miningRateSchema),
        defaultValues: { rate: 0.25 },
    });

    const onSubmit = async (data: z.infer<typeof miningRateSchema>) => {
        setIsSubmitting(true);
        try {
            await setGlobalBaseMiningRate(data.rate);
            form.reset({ rate: data.rate });
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
        defaultValues: { duration: 480 },
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
                    <CardDescription>Update the base mining rate for all users in the system.</CardDescription>
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
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="total-supply">Total Supply</TabsTrigger>
        </TabsList>
         <TabsContent value="total-supply" className="mt-6">
            <TotalSupplyManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}

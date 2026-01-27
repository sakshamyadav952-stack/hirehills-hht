
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, User, Coins, Send, ArrowLeft, Download, Smartphone, Hash, ShieldAlert } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

const findUserSchema = z.object({
  profileCode: z.string().length(6, 'Profile code must be 6 digits.'),
});
type FindUserFormValues = z.infer<typeof findUserSchema>;

const sendCoinsSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Amount must be greater than 0.' }),
});
type SendCoinsFormValues = z.infer<typeof sendCoinsSchema>;

const GooglePlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-6 w-6 mr-2">
        <path fill="#4CAF50" d="M315.8,256.3,52.2,463.1a32.3,32.3,0,0,0,29.3,26.4L315.8,256.3Z"/>
        <path fill="#2196F3" d="M52.2,48.9,315.8,256.3,52.2,463.1a32.3,32.3,0,0,1,0-57.8Z" transform="translate(0 -0.4)"/>
        <path fill="#FFC107" d="M485.7,219.1,348,256.3,485.7,293.4a32.3,32.3,0,0,0,0-74.3Z"/>
        <path fill="#F44336" d="M348,256.3,52.2,48.9,32.3,32.3,0,0,0,29.3-26.4L315.8,256.3Z"/>
    </svg>
);


export function SendCoinsFlow() {
  const { userProfile, transferCoins } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [showAppOnlyDialog, setShowAppOnlyDialog] = useState(false);
  const [showKycDialog, setShowKycDialog] = useState(false);

  useEffect(() => {
    setIsAndroidApp(typeof window.Android !== 'undefined');
  }, []);

  const findUserForm = useForm<FindUserFormValues>({
    resolver: zodResolver(findUserSchema),
    defaultValues: { profileCode: '' },
  });

  const sendCoinsForm = useForm<SendCoinsFormValues>({
    resolver: zodResolver(sendCoinsSchema),
    defaultValues: { amount: 0 },
  });

  const onFindUser = async (data: FindUserFormValues) => {
    setIsLoading(true);
    setFoundUser(null);
    try {
      const q = query(collection(firestore, 'users'), where('profileCode', '==', data.profileCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'User not found', description: 'No user found with that profile code.', variant: 'destructive' });
      } else {
        const userDoc = querySnapshot.docs[0];
        if (userDoc.id === userProfile?.id) {
          toast({ title: 'Cannot send to self', description: 'You cannot send coins to yourself.', variant: 'destructive' });
        } else {
          // We only need public data here, so no need to fetch private contact info
          setFoundUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to search for user.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const onSendCoins = async (data: SendCoinsFormValues) => {
    setShowKycDialog(true);
  };

  const handleBack = () => {
    setFoundUser(null);
    findUserForm.reset();
    sendCoinsForm.reset();
  };

  if (foundUser) {
    return (
      <div className="space-y-6">
        <AlertDialog open={showKycDialog} onOpenChange={setShowKycDialog}>
          <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
              <AlertDialogHeader>
                  <AlertDialogTitle className="text-amber-300 flex items-center gap-2">
                      <ShieldAlert /> Feature Disabled
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-amber-200/80 pt-4">
                      This feature is disabled until KYC is completed. It will be enabled after KYC for the community's interest.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                  <AlertDialogAction onClick={() => setShowKycDialog(false)} className="w-full bg-amber-500 text-black hover:bg-amber-400">
                      Got it
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button variant="ghost" onClick={handleBack} className="p-0 h-auto text-cyan-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to search
        </Button>
        <Card className="futuristic-card-bg-secondary">
            <CardContent className="pt-6 flex flex-col gap-2">
                <div>
                    <p className="font-bold text-white text-lg">{foundUser.fullName}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>{foundUser.profileCode}</span>
                </div>
            </CardContent>
        </Card>
        
        <p className="text-sm text-muted-foreground text-center">
            Your current balance is <span className="font-bold text-amber-300">{(userProfile?.minedCoins || 0).toFixed(4)} BLIT</span>.
        </p>

        <Form {...sendCoinsForm}>
          <form onSubmit={sendCoinsForm.handleSubmit(onSendCoins)} className="space-y-4">
            <FormField
              control={sendCoinsForm.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-200/90">Amount to Send</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.0001" placeholder="0.00" {...field} className="pl-10 bg-slate-900/50 border-amber-400/30 text-white" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full bg-cyan-500 text-black hover:bg-cyan-400">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="text-center">
        <h3 className="font-semibold text-amber-200">Send Blistree Coins</h3>
        <p className="text-sm text-muted-foreground">Enter the recipient's 6-digit profile code to find them.</p>
       </div>
      <Form {...findUserForm}>
        <form onSubmit={findUserForm.handleSubmit(onFindUser)} className="flex flex-col sm:flex-row items-start gap-2">
          <FormField
            control={findUserForm.control}
            name="profileCode"
            render={({ field }) => (
              <FormItem className="flex-1 w-full">
                <FormControl>
                  <Input placeholder="123456" {...field} className="bg-slate-900/50 border-amber-400/30 text-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-cyan-500 text-black hover:bg-cyan-400">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find
          </Button>
        </form>
      </Form>
    </div>
  );
}



'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, User, Mail, Phone, Calendar, Users, UserPlus } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const findUserSchema = z.object({
  profileCode: z.string().length(6, 'Profile code must be 6 digits.'),
});
type FindUserFormValues = z.infer<typeof findUserSchema>;

export default function FindFriendsPage() {
  const { userProfile, applyReferralCode } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  const form = useForm<FindUserFormValues>({
    resolver: zodResolver(findUserSchema),
    defaultValues: { profileCode: '' },
  });

  const onFindUser = async (data: FindUserFormValues) => {
    setIsLoading(true);
    setFoundUser(null);
    try {
      const q = query(collection(firestore, 'users'), where('profileCode', '==', data.profileCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'User not found', description: 'No user found with that profile code.', variant: 'destructive' });
      } else {
        const userDoc = querySnapshot.docs[0];
        setFoundUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to search for user.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetReferrer = async (code: string) => {
    try {
      await applyReferralCode(code);
      setFoundUser(null); // Reset after applying
      form.reset();
    } catch (error) {
      // Toast is handled in the hook
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Find Friends</CardTitle>
          <CardDescription>Search for a friend by their profile code to set them as your referrer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFindUser)} className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="profileCode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="sr-only">Find</span>
              </Button>
            </form>
          </Form>

          {foundUser && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={foundUser.profileImageUrl} alt={foundUser.fullName} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{foundUser.fullName}</CardTitle>
                    <p className="text-sm text-muted-foreground">@{foundUser.email.split('@')[0]}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Is this the person who referred you? Setting them as your referrer will give you both a permanent 0.1 coin/hour mining boost.
                </p>
                <Button
                  className="w-full mt-4"
                  onClick={() => handleSetReferrer(foundUser.profileCode)}
                  disabled={!!userProfile?.referredBy}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  {userProfile?.referredBy ? 'Referrer Already Set' : 'Set as My Referrer'}
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

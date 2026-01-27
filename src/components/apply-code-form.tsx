'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const applyCodeSchema = z.object({
  profileCode: z.string().length(6, 'Profile code must be 6 digits.'),
});

type ApplyCodeFormValues = z.infer<typeof applyCodeSchema>;

export function ApplyCodeForm() {
  const { userProfile, applyReferralCode } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ApplyCodeFormValues>({
    resolver: zodResolver(applyCodeSchema),
    defaultValues: {
      profileCode: '',
    },
  });

  const onSubmit = async (data: ApplyCodeFormValues) => {
    setIsLoading(true);
    try {
      await applyReferralCode(data.profileCode);
      form.reset();
    } catch (error) {
      // Error toast is handled in applyReferralCode function
    } finally {
      setIsLoading(false);
    }
  };

  if (userProfile?.referredBy) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Code Already Applied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have already been referred by{' '}
            <span className="font-semibold text-foreground">{userProfile.referredByName}</span>. You can only apply one referral code.
          </p>
           <Button asChild className="mt-4">
             <Link href="/profile">View Profile</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Enter Referral Code</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="profileCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>6-Digit Profile Code</FormLabel>
                  <FormControl>
                    <Input placeholder="123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Apply Code
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const applyCodeSchema = z.object({
  referrerCode: z.string().length(6, 'Referrer code must be 6 digits.'),
  refereeCode: z.string().length(6, 'Referee code must be 6 digits.'),
});

type ApplyCodeFormValues = z.infer<typeof applyCodeSchema>;

export default function AdminApplyCodePage() {
  const { adminApplyReferralCode } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ApplyCodeFormValues>({
    resolver: zodResolver(applyCodeSchema),
    defaultValues: { referrerCode: '', refereeCode: '' },
  });

  const onSubmit = async (data: ApplyCodeFormValues) => {
    setIsLoading(true);
    try {
      await adminApplyReferralCode(data.referrerCode.toUpperCase(), data.refereeCode.toUpperCase());
      form.reset();
    } catch (error) {
      // Error is handled in the auth hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Apply Referral Code (Admin)</CardTitle>
          <CardDescription>
            Manually apply a referral code from one user (the referrer) to another (the referee).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="referrerCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referrer's Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the referrer's 6-digit code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="refereeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referee's Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the referee's 6-digit code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                Apply Code
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

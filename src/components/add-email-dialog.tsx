

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { AddEmailFormValues } from '@/lib/types';

const addEmailSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

export function AddEmailDialog() {
  const { userProfile, updateUserEmail } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const hasRealEmail = userProfile?.email && !userProfile.email.endsWith('@blistree.in');
  const buttonText = hasRealEmail ? 'Change Email' : 'Add Email';

  const form = useForm<AddEmailFormValues>({
    resolver: zodResolver(addEmailSchema),
    defaultValues: { email: userProfile?.email?.endsWith('@blistree.in') ? '' : userProfile?.email || '' },
  });

  const onSubmit = async (data: AddEmailFormValues) => {
    setIsLoading(true);
    try {
      await updateUserEmail(data.email);
      setIsOpen(false);
      form.reset({ email: data.email }); // Reset form with the new email
    } catch (error: any) {
      // Error handling is managed inside the hook, which will show a toast.
      // We can add form-specific errors here if needed.
      if (error.code === 'auth/email-already-in-use') {
        form.setError('email', {
          type: 'manual',
          message: 'This email is already in use by another account.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">{buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
        <DialogHeader>
          <DialogTitle className="text-amber-300">{buttonText}</DialogTitle>
          <DialogDescription className="text-amber-200/80">
            {hasRealEmail ? 'Change your email address.' : 'Add an email for account recovery and important notifications.'} A verification link will be sent.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-amber-200/90">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} className="bg-slate-900/50 border-amber-400/30 text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className="bg-amber-500 text-black hover:bg-amber-400">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

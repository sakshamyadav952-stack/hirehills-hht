
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const onboardingSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.').or(z.literal('')).optional(),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: "Please select a gender.",
  }),
});


type OnboardingFormValues = z.infer<typeof onboardingSchema>;

type Step = 'name' | 'email' | 'gender';

export function OnboardingDialog() {
  const { userProfile, updateUserProfile, setShowOnboarding, showOnboarding } = useAuth();
  const firestore = useFirestore();
  const [step, setStep] = useState<Step>('name');
  const [isLoading, setIsLoading] = useState(false);
  
  const methods = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: '',
      email: '',
      gender: undefined,
    },
  });

  const handleNext = async (currentStep: Step, skip: boolean = false) => {
    let isValid = false;
    switch (currentStep) {
      case 'name':
        isValid = await methods.trigger('fullName');
        if (isValid) setStep('email');
        break;
      case 'email':
         if (skip) {
            methods.setValue('email', '');
            setStep('gender');
            return;
        }

        isValid = await methods.trigger('email');
        const emailValue = methods.getValues('email');
        
        if (!emailValue) {
            setStep('gender');
            return;
        }

        if (isValid) {
            setIsLoading(true);
            const email = methods.getValues('email');
            if (email) {
                const q = query(collection(firestore, 'users'), where('email', '==', email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    methods.setError('email', {
                        type: 'manual',
                        message: 'This email is already in use.',
                    });
                    setIsLoading(false);
                } else {
                    setStep('gender');
                    setIsLoading(false);
                }
            } else {
                setStep('gender');
                setIsLoading(false);
            }
        }
        break;
      case 'gender':
        // This case does not navigate, it submits.
        break;
    }
  };
  
  const handleSubmit = async (finalData: OnboardingFormValues) => {
    if (!userProfile) return;
    setIsLoading(true);

    const dataToUpdate: Partial<any> = {
        fullName: finalData.fullName,
        gender: finalData.gender,
    };
    
    // Only include email if it was provided
    if (finalData.email) {
        dataToUpdate.email = finalData.email;
    }


    try {
        await updateUserProfile(dataToUpdate);
        setShowOnboarding(false);
    } catch (error) {
        console.error("Failed to update profile", error);
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 'name':
        return (
            <Form {...methods}>
                <form onSubmit={(e) => { e.preventDefault(); handleNext('name'); }} className="space-y-4">
                <DialogHeader>
                    <DialogTitle className="text-amber-300">Welcome! What's your name?</DialogTitle>
                    <DialogDescription className="text-amber-200/80">Let's start by getting your full name.</DialogDescription>
                </DialogHeader>
                <FormField
                    control={methods.control}
                    name="fullName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-amber-200/90">Full Name</FormLabel>
                        <FormControl><Input placeholder="John Doe" {...field} className="bg-slate-900/50 border-amber-400/30 text-white" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" className="bg-amber-500 text-black hover:bg-amber-400">Next</Button>
                </DialogFooter>
                </form>
            </Form>
        );
      case 'email':
        return (
            <Form {...methods}>
                <form onSubmit={(e) => { e.preventDefault(); handleNext('email'); }} className="space-y-4">
                <DialogHeader>
                    <DialogTitle className="text-amber-300">What's your email?</DialogTitle>
                    <DialogDescription className="text-amber-200/80">We'll use this for account recovery and important notifications. You can skip this if you want.</DialogDescription>
                </DialogHeader>
                <FormField
                    control={methods.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-amber-200/90">Email (Optional)</FormLabel>
                        <FormControl>
                            <Input 
                                placeholder="you@example.com" 
                                {...field} 
                                value={methods.watch('email')}
                                defaultValue=""
                                className="bg-slate-900/50 border-amber-400/30 text-white"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button variant="ghost" type="button" onClick={() => setStep('name')} className="text-amber-300 hover:text-white">Back</Button>
                    <Button variant="outline" type="button" onClick={() => handleNext('email', true)} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Skip</Button>
                    <Button type="submit" disabled={isLoading} className="bg-amber-500 text-black hover:bg-amber-400">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Next'}
                    </Button>
                </DialogFooter>
                </form>
            </Form>
        );
      case 'gender':
        return (
            <Form {...methods}>
                <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
                <DialogHeader>
                    <DialogTitle className="text-amber-300">What's your gender?</DialogTitle>
                    <DialogDescription className="text-amber-200/80">This helps us personalize your experience.</DialogDescription>
                </DialogHeader>
                <FormField
                    control={methods.control}
                    name="gender"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-amber-200/90">Gender</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="bg-slate-900/50 border-amber-400/30 text-white"><SelectValue placeholder="Select a gender" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button variant="ghost" type="button" onClick={() => setStep('email')} className="text-amber-300 hover:text-white">Back</Button>
                    <Button type="submit" disabled={isLoading} className="bg-amber-500 text-black hover:bg-amber-400">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit
                    </Button>
                </DialogFooter>
                </form>
            </Form>
        );
    }
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={(open) => !open && setShowOnboarding(false)}>
      <DialogContent 
        className="sm:max-w-[425px] text-white border-amber-400/50" 
        style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}
        onInteractOutside={(e) => e.preventDefault()} 
        hideCloseButton={true}
      >
        <FormProvider {...methods}>
          {renderStep()}
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

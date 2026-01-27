'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import PhoneInput, { isValidPhoneNumber, type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Link from 'next/link';

// Schema for the mobile number step
const mobileSchema = z.object({
  mobileNumber: z.string().refine(isValidPhoneNumber, { message: 'Please enter a valid phone number.' }),
});
type MobileFormValues = z.infer<typeof mobileSchema>;

// Schema for the OTP step
const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits.'),
});
type OtpFormValues = z.infer<typeof otpSchema>;

// This is a custom input component that will be used by react-phone-number-input
const CustomPhoneInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return <input ref={ref} {...props} className="bg-transparent flex-1 py-3 outline-none text-white placeholder-gray-400" />;
});
CustomPhoneInput.displayName = 'CustomPhoneInput';


const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.657-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.245,44,30.028,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
);


// Separate component for the mobile number form
function MobileForm({ onOtpSent }: { onOtpSent: (confirmResult: ConfirmationResult) => void }) {
  const { initializeRecaptcha, signInWithPhoneNumber, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<Country | undefined>(undefined);
  
  const form = useForm<MobileFormValues>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { mobileNumber: '' },
  });

   useEffect(() => {
    setIsMounted(true);
    if (recaptchaContainerRef.current) {
        initializeRecaptcha(recaptchaContainerRef.current);
    }
    fetch('https://ipapi.co/country')
      .then((res) => (res.ok ? res.text() : Promise.reject('Failed to fetch country')))
      .then((countryCode) => {
        setDefaultCountry(countryCode as Country);
      })
      .catch(() => {
        setDefaultCountry('US'); // Fallback
      });
  }, [initializeRecaptcha]);

  const handleSendOtp = async (data: MobileFormValues) => {
    if (!recaptchaContainerRef.current) {
        toast({ title: 'Error', description: 'reCAPTCHA container not ready.', variant: 'destructive' });
        return;
    }
    setIsLoading(true);

    try {
        const confirmResult = await signInWithPhoneNumber(data.mobileNumber);
        onOtpSent(confirmResult);
        toast({ title: 'OTP Sent', description: 'An OTP has been sent to your mobile number.' });
    } catch (error: any) {
        console.error("Error in handleSendOtp:", error);
        toast({ title: 'Failed to Send OTP', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if ((window as any).startNativeGoogleLogin) {
      (window as any).startNativeGoogleLogin();
    } else {
      setIsGoogleLoading(true);
      try {
        await signInWithGoogle();
      } finally {
        setIsGoogleLoading(false);
      }
    }
  }

  return (
    <>
      <div ref={recaptchaContainerRef}></div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSendOtp)} className="space-y-6">
          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium mb-2">Mobile Number</FormLabel>
                <FormControl>
                  <div className="flex items-center justify-center h-[50px] w-full rounded-lg border border-green-400/30 bg-black/40 px-3">
                    {isMounted && defaultCountry ? (
                      <PhoneInput
                        {...field}
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry={defaultCountry}
                        placeholder="Enter phone number"
                        inputComponent={CustomPhoneInput}
                        className="flex items-center w-full"
                        countrySelectProps={{
                          className: 'mr-2 bg-transparent text-white border-r border-green-400/30 pr-2',
                        }}
                      />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !isMounted || !defaultCountry}
            className="w-full py-3 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 transition-all duration-200 shadow-[0_0_20px_rgba(0,255,150,0.6)] flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send OTP'}
          </button>
        </form>
      </Form>
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-green-400/30"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black/40 px-2 text-gray-400">Or continue with</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn} 
            disabled={isGoogleLoading || isLoading}
            className="w-full bg-black/40 border-green-400/30 hover:bg-green-900/40 hover:text-white"
            >
            {isGoogleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <GoogleIcon />
            )}
            Sign in with Google
          </Button>
        </>
    </>
  );
}

// Separate component for the OTP verification form
function OtpForm({ confirmationResult, onBack }: { confirmationResult: ConfirmationResult; onBack: () => void }) {
  const { confirmOtp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const handleVerifyOtp = async (data: OtpFormValues) => {
    setIsLoading(true);
    try {
      await confirmOtp(confirmationResult, data.otp);
    } catch (error: any) {
      toast({ title: 'Invalid OTP', description: 'The OTP you entered is incorrect. Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleVerifyOtp)} className="space-y-6">
        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="block text-sm font-medium mb-2">Enter OTP</FormLabel>
              <FormControl>
                <Input placeholder="123456" {...field} maxLength={6} type="tel" className="bg-black/40 border border-green-400/30 rounded-lg py-3 h-auto text-center tracking-[0.5em]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-2">
           <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg bg-green-500 text-black font-semibold hover:bg-green-400 transition-all duration-200 shadow-[0_0_20px_rgba(0,255,150,0.6)] flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify OTP'}
          </button>
          <Button variant="link" size="sm" onClick={onBack} className="text-gray-400 hover:text-green-400">
            Use a different number
          </Button>
        </div>
      </form>
    </Form>
  );
}


// Main component that controls which form to show
export function MobileOtpForm() {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const handleOtpSent = (confirmResult: ConfirmationResult) => {
    setConfirmationResult(confirmResult);
    setStep('otp');
  };

  const handleBackToMobile = () => {
    setStep('mobile');
    setConfirmationResult(null);
  };
  
  return (
    <>
      {step === 'otp' && confirmationResult ? (
        <OtpForm confirmationResult={confirmationResult} onBack={handleBackToMobile} />
      ) : (
        <MobileForm onOtpSent={handleOtpSent} />
      )}
      <div className="text-center pt-4 mt-6 border-t border-green-400/20">
          <p className="text-center text-gray-400 text-sm mb-2">
            By continuing, you agree to our{' '}
            <Link
              href="/privacy-policy"
              className="text-green-400 underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
          <Button
              variant="link"
              className="text-gray-400 hover:text-green-400"
              asChild
          >
              <a href="mailto:siggilence@gmail.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Us
              </a>
          </Button>
      </div>
    </>
  );
}

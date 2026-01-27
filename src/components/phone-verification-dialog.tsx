
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ConfirmationResult } from 'firebase/auth';

export function PhoneVerificationDialog() {
  const { userProfile, verifyPhoneNumber, confirmPhoneNumberVerification } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'initial' | 'verify'>('initial');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  // This div will hold the invisible reCAPTCHA widget
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const handleSendCode = async () => {
    if (!userProfile?.mobileNumber) {
      toast({ title: 'Error', description: 'Mobile number not found.', variant: 'destructive' });
      return;
    }
    if (!recaptchaContainerRef.current) {
        toast({ title: 'Error', description: 'Recaptcha container not ready.', variant: 'destructive' });
        return;
    }

    setIsLoading(true);
    try {
      // The `verifyPhoneNumber` function in `auth.tsx` will create and render the reCAPTCHA
      const confirmResult = await verifyPhoneNumber(userProfile.mobileNumber, recaptchaContainerRef.current);
      setConfirmationResult(confirmResult);
      setStep('verify');
      toast({ title: 'Code Sent', description: 'A verification code has been sent to your mobile number.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Failed to Send Code', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult) {
      toast({ title: 'Error', description: 'Verification process was not initiated.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await confirmPhoneNumberVerification(confirmationResult, verificationCode);
      toast({ title: 'Success!', description: 'Your phone number has been verified.' });
      setIsOpen(false); // Close dialog on success
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      setStep('initial');
      setIsLoading(false);
      setVerificationCode('');
      setConfirmationResult(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Verify</Button>
      </DialogTrigger>
      <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
        <DialogHeader>
          <DialogTitle className="text-amber-300">Verify Your Mobile Number</DialogTitle>
          <DialogDescription className="text-amber-200/80">
            {step === 'initial'
              ? `A verification code will be sent to: ${userProfile?.mobileNumber}.`
              : 'Enter the 6-digit code you received via SMS.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'initial' ? (
          <div className="py-4">
             {/* This container is required for the invisible reCAPTCHA */}
            <div ref={recaptchaContainerRef}></div>
            <p className="text-sm text-amber-200/70">
              Standard messaging rates may apply.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="bg-slate-900/50 border-amber-400/30 text-white"
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
          </DialogClose>
          {step === 'initial' ? (
            <Button onClick={handleSendCode} disabled={isLoading} className="bg-amber-500 text-black hover:bg-amber-400">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Code
            </Button>
          ) : (
            <Button onClick={handleVerifyCode} disabled={isLoading} className="bg-amber-500 text-black hover:bg-amber-400">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

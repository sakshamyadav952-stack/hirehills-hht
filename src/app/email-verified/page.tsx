
'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getAuth, applyActionCode } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseApp } from '@/firebase';

function EmailVerificationHandler() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // By getting the firebaseApp from the provider, we ensure it's initialized before we call getAuth()
  const firebaseApp = useFirebaseApp(); 

  useEffect(() => {
    const oobCode = searchParams.get('oobCode');

    if (oobCode) {
      const auth = getAuth(firebaseApp);
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          toast({
            title: 'Success!',
            description: 'Your email has been verified.',
          });
        })
        .catch((error) => {
          console.error('Error verifying email:', error);
          let message = 'Failed to verify email. The link may be invalid or expired.';
          if (error.code === 'auth/invalid-action-code') {
            message = 'Invalid verification link. It may have already been used or expired.';
          }
          setErrorMessage(message);
          setStatus('error');
          toast({
            title: 'Verification Failed',
            description: message,
            variant: 'destructive',
          });
        });
    } else {
      setErrorMessage('Invalid or missing verification code in the link.');
      setStatus('error');
    }
  }, [searchParams, toast, firebaseApp]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          {status === 'loading' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
              <CardTitle>Verifying Email...</CardTitle>
              <CardDescription>Please wait while we verify your email address.</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle>Email Verified!</CardTitle>
              <CardDescription>Thank you. Your email address has been successfully verified.</CardDescription>
            </>
          )}
          {status === 'error' && (
             <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                    <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle>Verification Failed</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
             </>
          )}
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function EmailVerifiedPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EmailVerificationHandler />
        </Suspense>
    );
}


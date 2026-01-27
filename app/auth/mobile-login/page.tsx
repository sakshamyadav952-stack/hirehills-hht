'use client';

import { MobileOtpForm } from '@/components/auth/mobile-otp-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MobileLoginPage() {
  return (
    <>
      <Button asChild variant="ghost" className="absolute top-4 left-4 text-gray-400 hover:text-white">
        <Link href="/auth/login">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Link>
      </Button>
      <Suspense fallback={<div className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}>
        <MobileOtpForm />
      </Suspense>
    </>
  );
}
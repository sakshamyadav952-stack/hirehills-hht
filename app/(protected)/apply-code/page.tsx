
'use client';

import { ApplyCodeForm } from '@/components/apply-code-form';

export default function ApplyCodePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Apply Code</h1>
        <p className="text-muted-foreground">Enter a user's 6-digit code to set them as your referrer. You'll get 10 BLIT coins and a +0.25 coin/hour mining boost when they are actively mining.</p>
      </div>
      <ApplyCodeForm />
    </div>
  );
}

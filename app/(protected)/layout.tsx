
'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';

  useEffect(() => {
    if (!loading && userProfile && pathname.startsWith('/admin') && !isAdmin) {
      router.push('/');
    }
  }, [loading, userProfile, router, pathname, isAdmin]);

  if (loading || !userProfile) {
    return (
      <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (pathname.startsWith('/admin') && !isAdmin) {
    return (
      <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
        <p>You are not authorized to view this page.</p>
      </div>
    );
  }

  return <div>{children}</div>;
}

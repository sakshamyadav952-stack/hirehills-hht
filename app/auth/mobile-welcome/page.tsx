
'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MobileWelcomePage() {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/auth/login');
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, #0d0d1a, #1a1a2e)' }}>
            <div className="relative w-full max-w-md text-center text-white p-8 rounded-2xl border border-amber-400/20 bg-black/30 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.15),transparent_70%)]"></div>
                
                <div className="inline-block p-4 mb-4 bg-amber-400/10 border-2 border-amber-400/20 rounded-full shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                    <AlertTriangle className="h-10 w-10 text-amber-300" />
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-amber-300" style={{ textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                    Action Required
                </h1>
                <p className="mt-4 text-lg text-amber-100/80">
                    Thank you for joining! For the best experience and full account features, new users are required to sign in using a Google account.
                </p>

                <div className="mt-8">
                    <Button
                        onClick={handleLogout}
                        size="lg"
                        className="w-full h-14 bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all duration-300 transform hover:scale-105"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout and Sign In with Google
                    </Button>
                </div>
            </div>
        </div>
    );
}

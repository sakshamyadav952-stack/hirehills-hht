'use client';

import type { ReactNode } from 'react';
import { useMemo, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import './globals.css';
import './custom-animations.css';
import { AuthProvider } from '@/lib/auth';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import '@/components/mining-animation.css';

declare global {
  interface Window {
      Android?: {
          showRewardedAd: () => void;
      };
      AndroidApp?: {
          startGoogleLogin: () => void;
      };
      onGoogleLoginSuccess?: (idToken: string) => void;
      applyMysteryBoxReward: (multiplier: number) => void;
      currentSpinWinnings?: number;
      currentSpinMultiplier?: number;
      applySpinMultiplierReward: () => void;
  }
}

function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);
  
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (pathname !== '/') {
        event.preventDefault();
        router.push('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pathname, router]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      <AuthProvider>
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </AuthProvider>
    </FirebaseProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const spinAudioRef = useRef<HTMLAudioElement>(null);
  const clickAudioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    const handleSpin = () => {
        if(spinAudioRef.current) {
            spinAudioRef.current.currentTime = 0;
            spinAudioRef.current.play().catch(() => {});
        }
    };
    const handleSpinEnd = () => {
        if(spinAudioRef.current) {
            spinAudioRef.current.pause();
            spinAudioRef.current.currentTime = 0;
        }
    };
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if(target.closest('button, a, [role="button"]')) {
            if(clickAudioRef.current) {
                clickAudioRef.current.currentTime = 0;
                clickAudioRef.current.play().catch(() => {});
            }
        }
    };
    
    window.addEventListener('spin-wheel-start', handleSpin);
    window.addEventListener('spin-wheel-end', handleSpinEnd);
    document.addEventListener('click', handleClick);

    return () => {
        window.removeEventListener('spin-wheel-start', handleSpin);
        window.removeEventListener('spin-wheel-end', handleSpinEnd);
        document.removeEventListener('click', handleClick);
    }
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Hirehills Tokens</title>
        <meta name='description' content='Mine HOT tokens and track your progress with Hirehills.' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#000000"/>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function startNativeGoogleLogin() {
                if (window.AndroidApp && typeof window.AndroidApp.startGoogleLogin === 'function') {
                  window.AndroidApp.startGoogleLogin();
                }
              }
              document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
              window.applySpinMultiplierReward = () => {
                const winnings = window.currentSpinWinnings;
                const multiplier = window.currentSpinMultiplier;
                if (typeof winnings === 'number' && typeof multiplier === 'number') {
                  window.dispatchEvent(new CustomEvent('applySpinReward', { detail: { winnings, multiplier } }));
                }
              };
            `,
          }}
        />
      </head>
      <body>
        <audio ref={clickAudioRef} preload="auto">
          <source src="https://cdn.pixabay.com/download/audio/2022/03/10/audio_c848a63261.mp3?filename=button-124476.mp3" type="audio/mpeg" />
        </audio>
        <audio ref={spinAudioRef} preload="auto" loop>
          <source src="https://cdn.pixabay.com/download/audio/2022/10/11/audio_166dcf1887.mp3?filename=casino-slot-machine-loop-122759.mp3" type="audio/mpeg" />
        </audio>
        <FirebaseClientProvider>
            {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

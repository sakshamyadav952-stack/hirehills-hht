
'use client';

import type { ReactNode } from 'react';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import './globals.css';
import './custom-animations.css';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider, initializeFirebase } from '@/firebase';
import '@/components/mining-animation.css';
import { getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import Head from 'next/head';

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
  
  // Handle Android back button press
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If we are on any page other than home, a back press should go to home.
      if (pathname !== '/') {
        // Prevent default back behavior and push to home page.
        event.preventDefault();
        router.push('/');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
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
    const playSpinSound = () => {
        if(spinAudioRef.current) {
            spinAudioRef.current.currentTime = 0;
            spinAudioRef.current.play().catch(err => {});
        }
    };

    const stopSpinSound = () => {
        if(spinAudioRef.current) {
            spinAudioRef.current.pause();
            spinAudioRef.current.currentTime = 0;
        }
    };

    const playClickSound = () => {
        if(clickAudioRef.current) {
            clickAudioRef.current.currentTime = 0;
            clickAudioRef.current.play().catch(err => {});
        }
    };
    
    const handleSpin = () => playSpinSound();
    const handleSpinEnd = () => stopSpinSound();
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if(target.closest('button, a, [role="button"]')) {
            playClickSound();
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
       <Head>
        <title>Hirehills Tokens</title>
        <meta name='description' content='Mine HOT tokens and track your progress with Hirehills.' />
        <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#000000"/>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function startNativeGoogleLogin() {
                if (window.AndroidApp && typeof window.AndroidApp.startGoogleLogin === 'function') {
                  window.AndroidApp.startGoogleLogin();
                } else {
                  console.warn('Native Google login interface not available.');
                }
              }

              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
                document.body.style.zoom = 'reset';
              });
              document.addEventListener('gesturechange', function (e) {
                e.preventDefault();
                document.body.style.zoom = 'reset';
              });
              document.addEventListener('gestureend', function (e) {
                e.preventDefault();
                document.body.style.zoom = 'reset';
              });
              window.addEventListener('wheel', function(e) {
                if (e.ctrlKey) {
                  e.preventDefault();
                }
              }, { passive: false });
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.applySpinMultiplierReward = () => {
                const winnings = window.currentSpinWinnings;
                const multiplier = window.currentSpinMultiplier;
                if (typeof winnings === 'number' && typeof multiplier === 'number') {
                  const event = new CustomEvent('applySpinReward', { detail: { winnings, multiplier } });
                  window.dispatchEvent(event);
                }
              };
            `,
          }}
        />
      </Head>
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

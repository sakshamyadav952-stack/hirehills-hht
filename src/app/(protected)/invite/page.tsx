
'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, UserPlus, ArrowLeft, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const WhatsAppIcon = () => (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M16 31C23.732 31 30 24.732 30 17C30 9.26801 23.732 3 16 3C8.26801 3 2 9.26801 2 17C2 19.5109 2.661 21.8674 3.81847 23.905L2 31L9.31486 29.3038C11.3014 30.3854 13.5789 31 16 31ZM16 28.8462C22.5425 28.8462 27.8462 23.5425 27.8462 17C27.8462 10.4576 22.5425 5.15385 16 5.15385C9.45755 5.15385 4.15385 10.4576 4.15385 17C4.15385 19.5261 4.9445 20.8675 6.29184 22.7902L5.23077 26.7692L9.27993 25.7569C11.1894 27.0746 13.5046 27.8462 16 27.8462Z" fill="#BFC8D0"/>
        <path d="M28 16C28 22.6274 22.6274 28 16 28C13.4722 28 11.1269 27.2184 9.19266 25.8837L5.09091 26.9091L6.16576 22.8784C4.80092 20.9307 4 18.5589 4 16C4 9.37258 9.37258 4 16 4C22.6274 4 28 9.37258 28 16Z" fill="url(#paint0_linear_87_7264)"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 18.5109 2.661 20.8674 3.81847 22.905L2 30L9.31486 28.3038C11.3014 29.3854 13.5789 30 16 30ZM16 27.8462C22.5425 27.8462 27.8462 22.5425 27.8462 16C27.8462 9.45755 22.5425 4.15385 16 4.15385C9.45755 4.15385 4.15385 9.45755 4.15385 16C4.15385 18.5261 4.9445 20.8675 6.29184 22.7902L5.23077 26.7692L9.27993 25.7569C11.1894 27.0746 13.5046 27.8462 16 27.8462Z" fill="white"/>
        <path d="M12.5 9.49989C12.1672 8.83131 11.6565 8.8905 11.1407 8.8905C10.2188 8.8905 8.78125 9.99478 8.78125 12.05C8.78125 13.7343 9.52345 15.578 12.0244 18.3361C14.438 20.9979 17.6094 22.3748 20.2422 22.3279C22.875 22.2811 23.4167 20.0154 23.4167 19.2503C23.4167 18.9112 23.2062 18.742 23.0613 18.696C22.1641 18.2654 20.5093 17.4631 20.1328 17.3124C19.7563 17.1617 19.5597 17.3656 19.4375 17.4765C19.0961 17.8018 18.4193 18.7608 18.1875 18.9765C17.9558 19.1922 17.6103 19.083 17.4665 19.0015C16.9374 18.7892 15.5029 18.1511 14.3595 17.0426C12.9453 15.6718 12.8623 15.2001 12.5959 14.7803C12.3828 14.4444 12.5392 14.2384 12.6172 14.1483C12.9219 13.7968 13.3426 13.254 13.5313 12.9843C13.7199 12.7145 13.5702 12.305 13.4803 12.05C13.0938 10.953 12.7663 10.0347 12.5 9.49989Z" fill="white"/>
        <defs>
        <linearGradient id="paint0_linear_87_7264" x1="26.5" y1="7" x2="4" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5BD066"/>
        <stop offset="1" stopColor="#27B43E"/>
        </linearGradient>
        </defs>
    </svg>
);

const TelegramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48" className="fill-current">
    <path d="M41,5,6.22,18.84a3,3,0,0,0-1.2,5.54l8.65,3.53,3.53,8.65a3,3,0,0,0,5.54-1.2L43,7a3,3,0,0,0-2-2Z"/><path d="M21.19,26.81l3.54,8.65a3,3,0,0,0,5.54-1.2L43,7a3,3,0,0,0-2-2L6.22,18.84a3,3,0,0,0-1.2,5.54l8.65,3.53Z" opacity=".5"/>
  </svg>
);

const FacebookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
        <path fill="#1877f2" d="M1024,512C1024,229.23016,794.76978,0,512,0S0,229.23016,0,512c0,255.554,187.231,467.37012,432,505.77777V660H302V512H432V399.2C432,270.87982,508.43854,200,625.38922,200,681.40765,200,740,210,740,210V336H675.43713C611.83508,336,592,375.46667,592,415.95728V512H734L711.3,660H592v357.77777C836.769,979.37012,1024,767.554,1024,512Z"></path>
        <path fill="#fff" d="M711.3,660,734,512H592V415.95728C592,375.46667,611.83508,336,675.43713,336H740V210s-58.59235-10-114.61078-10C508.43854,200,432,270.87982,432,399.2V512H302V660H432v357.77777a517.39619,517.39619,0,0,0,160,0V660Z"></path>
    </svg>
);

export default function InvitePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  if (!userProfile) {
    return null;
  }
  
  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copied to clipboard!',
    });
  };

  const referralCode = userProfile.profileCode;
  const webLink = "https://play.google.com/store/apps/details?id=com.hirehills.app";
  const shareText = `Join me on Hirehills! When you use my code, you'll get 10 HOT tokens instantly + a 0.25/hr mining boost. I'll get a 0.25/hr boost too. It's a win-win! 🚀\n\n1. Download the app: ${webLink}\n\n2. Sign up and go to the "Apply Code" section in the menu.\n\n3. Enter my code: ${referralCode}\n\nHappy Mining!`;
  const encodedShareText = encodeURIComponent(shareText);

  const shareOptions = [
    { name: 'WhatsApp', icon: <WhatsAppIcon />, url: `https://wa.me/?text=${encodedShareText}` },
    { name: 'Telegram', icon: <TelegramIcon />, url: `https://t.me/share/url?url=${webLink}&text=${encodedShareText}` },
    { name: 'Facebook', icon: <FacebookIcon />, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webLink)}&quote=${encodedShareText}` },
  ];

  return (
    <div className="flex flex-col h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-amber-400/20">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Invite Friends</h1>
        <div className="w-9"></div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="text-center">
            <div className="inline-block p-4 mb-4 bg-cyan-400/10 border-2 border-cyan-400/20 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                <UserPlus className="h-10 w-10 text-cyan-300" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Invite & Earn Together</h1>
            <p className="mt-2 text-cyan-200/70 max-w-sm mx-auto">When a friend uses your code, they get 10 HOT + a 0.25/hr boost, and you get a 0.25/hr boost.</p>
        </div>
        
        <div className="space-y-4">
            <Label htmlFor="referral-code" className="text-lg font-semibold text-amber-300">Your Referral Code</Label>
            <div className="flex items-center gap-2 p-4 rounded-lg bg-black/30 border border-amber-400/30">
                <p id="referral-code" className="text-2xl font-mono tracking-widest flex-1 text-center">{referralCode}</p>
                <Button size="icon" variant="ghost" onClick={() => handleCopy(referralCode)} className="text-amber-300 hover:bg-amber-400/20 hover:text-white">
                    <Copy className="h-6 w-6" />
                </Button>
            </div>
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-semibold text-amber-300">Share via</Label>
          <div className="space-y-3">
            {shareOptions.map((option) => (
              <Button
                key={option.name}
                variant="outline"
                className="w-full h-16 justify-start p-4 bg-black/20 border-cyan-400/20 text-white hover:bg-cyan-500/10 hover:border-cyan-400/40"
                onClick={() => window.open(option.url, '_blank', 'noopener,noreferrer')}
              >
                <div className="flex items-center gap-4">
                  {option.icon}
                  <span className="text-base font-semibold">{option.name}</span>
                </div>
                <Share2 className="ml-auto h-5 w-5 text-cyan-400/70" />
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
            <Button onClick={() => handleCopy(shareText)} variant="outline" size="lg" className="w-full bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white">
                <Copy className="mr-2 h-5 w-5" />
                Copy Invite Text
            </Button>
            <p className="text-center text-xs text-muted-foreground">Tap to copy the full invitation message and share it with your friends.</p>
        </div>
        
        <div className="h-20 md:hidden" />
      </main>
    </div>
  );
}

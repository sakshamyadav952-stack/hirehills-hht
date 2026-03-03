
'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, ArrowLeft, Megaphone, Coins, Gift } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const WhatsAppIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
);

const TelegramIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.084-1.362 5.441-.168.572-.336.764-.538.782-.44.041-.773-.29-.199-.508.374-1.41.524-2.121.45-2.135-.074-.014-.424.24-.914.614-.53.405-.98.685-1.35.841-.37.156-.704.224-1.002.204-.44-.03-.85-.24-1.22-.631-.45-.47-.81-.94-1.08-1.41.33-.14.66-.28.99-.42.33-.14.66-.28.99-.42.22.42.44.84.66 1.26.22.42.44.84.66 1.26-.22-.42-.44-.84-.66-1.26-.22-.42-.44-.84-.66-1.26.33.14.66.28.99.42.33.14.66.28.99.42z"/>
        <path d="M19.896 6.23c-.158-.13-.39-.158-.58-.07L4.048 11.412c-.28.11-.46.38-.46.68s.18.57.46.68l4.052 1.61c.22.09.47.06.66-.08l2.51-1.88c.15-.11.35-.08.46.07s.05.35-.1.46l-2.02 1.51c-.12.09-.19.23-.19.38v2.21c0 .24.16.45.39.51.04.01.08.02.12.02.19 0 .37-.11.45-.29l1.15-2.29c.08-.16.25-.26.43-.26h.03l3.41.43c.21.03.42-.08.52-.27l4.05-10.41c.08-.21.02-.45-.15-.58z" />
    </svg>
);

const FacebookIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.325 10.964 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.355-4.669 1.227 0 2.511.219 2.511.219v2.76h-1.414c-1.49 0-1.85.925-1.85 1.874v2.25h3.11l-.498 3.469h-2.612v8.385C19.675 23.037 24 18.062 24 12.073z"/>
    </svg>
);

export default function InvitePage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  if (!userProfile) return null;
  
  const referralCode = userProfile.profileCode;
  const webLink = "https://play.google.com/store/apps/details?id=com.hirehills.app";
  const shareText = `Join me on Hirehills! Use my code ${referralCode} to get 10 HOT tokens + a 0.25/hr boost. Let's mine together! 🚀\n\nDownload: ${webLink}`;
  const encodedShareText = encodeURIComponent(shareText);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: 'Code Copied!', description: 'Your invite code is ready to share.' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#5433D6] text-white">
      <header className="p-6 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full bg-white/10 hover:bg-white/20"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="w-10" />
      </header>

      <main className="flex-1 px-6 pb-20 flex flex-col items-center gap-8 relative overflow-hidden">
        <div className="absolute top-10 left-10 opacity-20 animate-bounce delay-100"><Coins className="h-8 w-8 text-yellow-400" /></div>
        <div className="absolute top-40 right-10 opacity-20 animate-bounce delay-300"><Gift className="h-8 w-8 text-pink-400" /></div>
        <div className="absolute bottom-20 left-5 opacity-10"><Coins className="h-12 w-12 text-yellow-400" /></div>

        <div className="text-center space-y-4 z-10">
            <div className="flex items-center justify-center gap-3">
                <div className="bg-white rounded-full p-3 shadow-lg transform -rotate-12">
                    <Megaphone className="h-8 w-8 text-red-500 fill-red-500" />
                </div>
                <h1 className="text-4xl font-black tracking-tight drop-shadow-md uppercase italic">Invite Friends</h1>
            </div>
            <div className="relative">
                <div className="h-1 w-32 bg-yellow-400 mx-auto rounded-full mb-4 opacity-50" />
                <p className="text-lg font-bold tracking-wide text-white/90">Share your invite code and earn rewards!</p>
            </div>
        </div>

        <div className="w-full max-w-sm relative mt-12 mb-8">
            <div className="absolute -top-16 -left-4 flex flex-col items-center animate-bounce">
                <div className="w-16 h-16 rounded-full bg-blue-400 border-4 border-white flex items-center justify-center shadow-xl">
                    <span className="text-2xl">👦</span>
                </div>
                <Coins className="h-6 w-6 text-yellow-400 -mt-2" />
            </div>
            <div className="absolute -top-16 -right-4 flex flex-col items-center animate-bounce delay-150">
                <div className="w-16 h-16 rounded-full bg-pink-400 border-4 border-white flex items-center justify-center shadow-xl">
                    <span className="text-2xl">👱</span>
                </div>
                <Gift className="h-6 w-6 text-orange-400 -mt-2" />
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-center space-y-4">
                <p className="text-[#5433D6]/60 font-black text-xs uppercase tracking-widest">Your Invite Code:</p>
                <div 
                    onClick={handleCopy}
                    className="bg-[#F3F4F6] rounded-2xl p-4 border-2 border-dashed border-[#5433D6]/20 flex items-center justify-center gap-4 cursor-pointer hover:bg-[#EBEEF1] transition-colors group"
                >
                    <span className="text-3xl font-black tracking-widest text-[#5433D6] tabular-nums">
                        {referralCode}
                    </span>
                    <Copy className="h-6 w-6 text-[#5433D6]/40 group-hover:scale-110 transition-transform" />
                </div>
            </div>
            
            <div className="absolute -bottom-6 -right-2 bg-yellow-400 rounded-full p-2 border-4 border-white shadow-xl animate-pulse">
                <Coins className="h-8 w-8 text-[#A87900]" />
            </div>
        </div>

        <div className="w-full max-w-sm text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <p className="font-black text-sm uppercase tracking-widest">Share your code:</p>
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <ShareButton 
                    icon={<FacebookIcon />} 
                    color="bg-[#1877F2]" 
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webLink)}&quote=${encodedShareText}`)}
                />
                <ShareButton 
                    icon={<WhatsAppIcon />} 
                    color="bg-[#25D366]" 
                    onClick={() => window.open(`https://wa.me/?text=${encodedShareText}`)}
                />
                <ShareButton 
                    icon={<TelegramIcon />} 
                    color="bg-[#0088CC]" 
                    onClick={() => window.open(`https://t.me/share/url?url=${webLink}&text=${encodedShareText}`)}
                />
            </div>
        </div>

        <Button 
            onClick={() => handleCopy()}
            className="w-full max-w-sm h-16 rounded-[2rem] bg-yellow-400 hover:bg-yellow-300 text-[#A87900] font-black uppercase text-lg shadow-[0_8px_0_#C09000] active:translate-y-1 active:shadow-none transition-all mt-4"
        >
            Copy My Code
        </Button>
      </main>
    </div>
  );
}

function ShareButton({ icon, color, onClick }: { icon: React.ReactNode, color: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "h-20 rounded-3xl flex items-center justify-center text-white shadow-xl transform transition-transform active:scale-90 hover:brightness-110",
                color
            )}
        >
            {icon}
        </button>
    )
}

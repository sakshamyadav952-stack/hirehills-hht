
'use client';

import React from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, UserPlus, ArrowLeft, Share2, Zap, Shield, Users, Rocket, Globe, Cpu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
      title: 'Protocol Link Copied',
      description: 'The secure transmission link is ready for broadcast.',
    });
  };

  const referralCode = userProfile.profileCode;
  const webLink = "https://play.google.com/store/apps/details?id=com.hirehills.app";
  const shareText = `Join the Hirehills Network! Use my node activation code: ${referralCode} to receive 10 HOT tokens + a 0.25/hr mining efficiency boost. Secure your stake in the future of compute. 🚀\n\n1. Download App: ${webLink}\n\n2. Use Code: ${referralCode}\n\nHappy Mining!`;
  const encodedShareText = encodeURIComponent(shareText);

  const shareOptions = [
    { name: 'WhatsApp', icon: <WhatsAppIcon />, url: `https://wa.me/?text=${encodedShareText}`, color: 'bg-green-500/10 border-green-500/20' },
    { name: 'Telegram', icon: <TelegramIcon />, url: `https://t.me/share/url?url=${webLink}&text=${encodedShareText}`, color: 'bg-blue-500/10 border-blue-500/20' },
    { name: 'Facebook', icon: <FacebookIcon />, url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(webLink)}&quote=${encodedShareText}`, color: 'bg-indigo-500/10 border-indigo-500/20' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Tactical Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between p-6 bg-black/80 backdrop-blur-2xl border-b border-white/5">
        <button 
          onClick={() => router.back()}
          className="group w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
        >
          <ArrowLeft className="h-5 w-5 text-white/60 group-hover:text-white" />
        </button>
        <div className="flex flex-col items-center">
            <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Expansion Protocol</h1>
            <div className="h-0.5 w-8 bg-purple-600 mt-1 rounded-full animate-pulse" />
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 p-6 space-y-10 pb-32">
        {/* Holographic Hero */}
        <section className="relative py-4">
            <div className="absolute inset-0 bg-purple-600/20 blur-[100px] rounded-full opacity-20 animate-pulse" />
            <div className="relative z-10 text-center space-y-4">
                <div className="inline-flex p-5 rounded-[2rem] bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                    <UserPlus className="h-12 w-12 text-purple-400" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic skew-x-[-6deg]">Node Sync</h2>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">Mesh Network Expansion v4.0</p>
                </div>
            </div>
        </section>

        {/* Activation Code Terminal */}
        <section className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-400 rounded-[3rem] blur opacity-20" />
            <div className="relative glass-card rounded-[2.5rem] p-1 border-white/10 overflow-hidden">
                <div className="bg-black/40 p-8 rounded-[2.4rem] text-center space-y-6">
                    <div className="flex justify-between items-center px-4">
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Protocol ID</span>
                        <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-purple-600 animate-ping" />
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                        </div>
                    </div>
                    
                    <div className="py-4">
                        <span className="text-6xl font-black tracking-[0.25em] tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {referralCode}
                        </span>
                    </div>

                    <button 
                        onClick={() => handleCopy(referralCode)}
                        className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
                    >
                        <Copy className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Copy Activation Key</span>
                    </button>
                </div>
            </div>
        </section>

        {/* Network Rewards Matrix */}
        <section className="space-y-6">
            <div className="flex items-center gap-4 px-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Node Uplink Rewards</h3>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                <RewardNode 
                    icon={<Zap className="h-5 w-5 text-cyan-400" />}
                    title="Compute Overclock"
                    value="+0.25 HOT/hr"
                    desc="Mining efficiency boost for both peers"
                />
                <RewardNode 
                    icon={<Rocket className="h-5 w-5 text-purple-400" />}
                    title="Instant Protocol Credit"
                    value="10.00 HOT"
                    desc="Initial stake added upon successful sync"
                />
                <RewardNode 
                    icon={<Shield className="h-5 w-5 text-green-400" />}
                    title="Security Integrity"
                    value="Layer 2 Verified"
                    desc="Higher priority for future KYC slots"
                />
            </div>
        </section>

        {/* Transmission Array */}
        <section className="space-y-6">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] px-2 text-center">Transmission Channels</h3>
            <div className="grid grid-cols-3 gap-4">
                {shareOptions.map((option) => (
                    <button
                        key={option.name}
                        onClick={() => window.open(option.url, '_blank')}
                        className={cn(
                            "flex flex-col items-center justify-center gap-4 p-6 rounded-[2rem] border transition-all hover:translate-y-[-4px] active:scale-95 group relative overflow-hidden",
                            option.color
                        )}
                    >
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">{option.icon}</div>
                        <span className="relative z-10 text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/80 transition-colors">{option.name}</span>
                    </button>
                ))}
            </div>
        </section>

        {/* Primary Broadcast Button */}
        <div className="px-2">
            <button 
                onClick={() => handleCopy(shareText)} 
                className="w-full h-20 rounded-[2rem] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all active:scale-95 flex items-center justify-center gap-4 border-b-4 border-black/20"
            >
                <Share2 className="h-5 w-5" />
                Broadcast Protocol Data
            </button>
            <p className="text-[8px] text-center text-white/20 mt-4 uppercase tracking-widest font-bold">Secure point-to-point encryption active</p>
        </div>
      </main>
    </div>
  );
}

function RewardNode({ icon, title, value, desc }: { icon: React.ReactNode, title: string, value: string, desc: string }) {
    return (
        <div className="group relative">
            <div className="absolute inset-0 bg-white/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-5 p-5 rounded-3xl bg-white/[0.02] border border-white/5 transition-all group-hover:border-white/10">
                <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center border border-white/10 shadow-inner group-hover:border-purple-500/30 transition-colors">
                    {icon}
                </div>
                <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-baseline">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{title}</p>
                        <span className="text-xs font-black text-white italic">{value}</span>
                    </div>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-tight leading-tight">{desc}</p>
                </div>
            </div>
        </div>
    );
}

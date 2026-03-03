'use client';

import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ReferralList() {
  const { allReferrals, referralsLoading } = useAuth();

  if (referralsLoading) {
    return (
      <div className="flex items-center justify-center p-12 h-64">
        <div className="relative">
            <Loader2 className="h-10 w-10 animate-spin text-[#00B4D8]" />
            <div className="absolute inset-0 blur-md h-10 w-10 animate-pulse bg-[#00B4D8]/20" />
        </div>
      </div>
    );
  }

  if (!allReferrals || allReferrals.length === 0) {
    return (
        <div className="text-center p-12 border border-white/5 rounded-[2.5rem] bg-[#001219]/50 backdrop-blur-md">
            <Users className="mx-auto h-16 w-16 text-white/10 mb-4" />
            <h3 className="text-xl font-black uppercase tracking-widest italic text-white/40">Terminal Isolated</h3>
            <p className="mt-2 text-xs text-white/20 uppercase tracking-widest font-bold">No external nodes detected in your circle.</p>
        </div>
    );
  }
  
  return (
    <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-gradient-to-b from-[#001219]/90 to-[#000814]/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="divide-y divide-white/5">
            {allReferrals.map((referral) => {
                const isActive = referral.status === 'Active';
                
                return (
                <div key={referral.id} className="p-5 sm:p-7 flex items-center justify-between group transition-all hover:bg-white/[0.03]">
                    <div className="flex items-center gap-5">
                         <div className="relative">
                            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-[#00B4D8]/20 shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:border-[#00B4D8]/50">
                                {referral.profileImageUrl && <AvatarImage src={referral.profileImageUrl} alt={referral.fullName} />}
                                <AvatarFallback className="bg-[#001d3d] text-[#00B4D8] font-black text-xl uppercase">
                                    {referral.fullName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            {isActive && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[#001219] shadow-lg animate-pulse" />
                            )}
                         </div>
                        <div className="space-y-1.5">
                            <div className="font-black text-xl sm:text-2xl text-white tracking-tighter leading-none group-hover:text-[#00B4D8] transition-colors">
                                {referral.fullName}
                            </div>
                            <div className={cn(
                                "flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]",
                                isActive ? "text-emerald-400" : "text-rose-400"
                            )}>
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    isActive ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_currentColor]" : "bg-rose-400 shadow-[0_0_8px_currentColor]"
                                )} />
                                <span>{isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className={cn(
                        "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl border transition-all duration-500",
                        isActive 
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 group-hover:border-emerald-500/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" 
                            : "border-rose-500/20 bg-rose-500/5 text-rose-400 group-hover:border-rose-500/40 shadow-[inset_0_0_10px_rgba(244,63,94,0.05)]"
                    )}>
                        <div className={cn(
                            "w-2.5 h-2.5 rounded-full",
                            isActive ? "bg-emerald-400 shadow-[0_0_10px_currentColor]" : "bg-rose-400 shadow-[0_0_10px_currentColor]"
                        )} />
                        <span className="text-sm sm:text-base font-black uppercase tracking-tighter italic text-responsive-base">
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            )})}
        </div>
    </div>
  );
}

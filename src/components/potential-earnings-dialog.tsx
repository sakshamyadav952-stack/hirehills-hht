'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Zap, Gift, Users, Clapperboard, Sparkles } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useMemo } from 'react';

interface PotentialEarningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: UserProfile | null;
}

export function PotentialEarningsDialog({ open, onOpenChange, userProfile }: PotentialEarningsDialogProps) {
    const sessionHours = 8;
    
    const calculations = useMemo(() => {
        if (!userProfile) return null;

        const baseRate = userProfile.baseMiningRate || 0.25;
        const existingReferrals = userProfile.referrals?.length || 0;
        const hasAppliedCode = !!userProfile.referredBy;

        // --- Descriptions ---
        const baseRateDesc = `${baseRate}/hr base`;
        const appliedCodeDesc = hasAppliedCode ? ` + 0.1/hr from applied code` : '';
        const referralDesc = existingReferrals > 0 ? ` + ${(existingReferrals * 0.1).toFixed(1)}/hr from referrals` : '';
        const baseEarningDescription = `(${[baseRateDesc, appliedCodeDesc, referralDesc].filter(Boolean).join(', ')})`;

        const neededReferrals = Math.max(0, 5 - existingReferrals);
        const maxPotentialReferralDesc = neededReferrals > 0 ? `+ ${neededReferrals} more referral${neededReferrals > 1 ? 's' : ''}` : '';
        const maxPotentialCodeDesc = !hasAppliedCode ? '+ applied code' : '';
        const maxPotentialDescription = `All tasks with ads, ${[maxPotentialReferralDesc, maxPotentialCodeDesc].filter(Boolean).join(', ')}`;


        // --- Calculations ---
        const baseReferralBonus = existingReferrals * 0.1;
        const appliedCodeBonus = hasAppliedCode ? 0.1 : 0;
        const currentTotalBaseRate = baseRate + baseReferralBonus + appliedCodeBonus;
        const baseEarnings = currentTotalBaseRate * sessionHours;

        const avgMysteryBoxRateIncrease = 0.055; 
        const mysteryBoxHours = 2 + 4 + 8;
        const mysteryBoxEarningsNoAds = avgMysteryBoxRateIncrease * mysteryBoxHours;
        const spinEarningsNoAds = 2;
        const earningsWithTasksNoAds = baseEarnings + mysteryBoxEarningsNoAds + spinEarningsNoAds;
        
        const avgMultiplier = 2.5;
        const mysteryBoxEarningsWithAds = mysteryBoxEarningsNoAds * avgMultiplier;
        const spinEarningsWithAds = 5;
        const earningsWithTasksAndAds = baseEarnings + mysteryBoxEarningsWithAds + spinEarningsWithAds;
        
        const additionalReferralBonus = neededReferrals * 0.1;
        const newCodeBonus = hasAppliedCode ? 0 : 0.1;
        const additionalTotalBonus = (additionalReferralBonus + newCodeBonus) * sessionHours;
        
        const fullPotentialEarnings = earningsWithTasksAndAds + additionalTotalBonus;

        return {
            baseEarnings,
            earningsWithTasksNoAds,
            earningsWithTasksAndAds,
            fullPotentialEarnings,
            baseEarningDescription,
            maxPotentialDescription,
        };
    }, [userProfile, sessionHours]);

    if (!calculations) return null;

    const { baseEarnings, earningsWithTasksNoAds, earningsWithTasksAndAds, fullPotentialEarnings, baseEarningDescription, maxPotentialDescription } = calculations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="text-white border-cyan-400/50 max-h-[90dvh] overflow-y-auto" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-bold text-cyan-300 tracking-wider">Your Potential Earnings</DialogTitle>
          <DialogDescription className="text-cyan-200/80 pt-1">
            Here's what you could earn this 8-hour session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
            <EarningTier
                icon={<Zap className="text-cyan-400" />}
                title="Base Session Earnings"
                amount={baseEarnings}
                description={baseEarningDescription}
            />
            <EarningTier
                icon={<Gift className="text-purple-400" />}
                title="With All Tasks (No Ads)"
                amount={earningsWithTasksNoAds}
                description="Base earnings + all boxes & spins (no ads)."
            />
            <EarningTier
                icon={<Clapperboard className="text-rose-400" />}
                title="With All Tasks & Ads"
                amount={earningsWithTasksAndAds}
                description="Watch ads on boxes & spins for max boosts."
            />
             {fullPotentialEarnings > earningsWithTasksAndAds && (
                 <EarningTier
                    icon={<Sparkles className="text-amber-400" />}
                    title="Maximum Average Potential"
                    amount={fullPotentialEarnings}
                    description={maxPotentialDescription}
                    isMax
                />
            )}
        </div>

        <p className="text-xs text-muted-foreground text-center px-4">
          Note: These are estimated potential earnings and may vary based on activity and luck.
        </p>

        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" className="w-full bg-cyan-500 text-black hover:bg-cyan-400">Start Earning!</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const EarningTier = ({ icon, title, amount, description, isMax = false }: { icon: React.ReactNode, title: string, amount: number, description: string, isMax?: boolean }) => {
    return (
        <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${isMax ? 'border-amber-400/40 bg-amber-900/20' : 'border-cyan-400/20 bg-slate-800/50'}`}>
            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">{icon}</div>
            <div className="flex-1">
                <p className={`font-semibold text-sm ${isMax ? 'text-amber-300' : 'text-cyan-300'}`}>{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="text-right">
                <p className={`font-bold ${isMax ? 'text-amber-300' : 'text-white'}`}>{amount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">BLIT</p>
            </div>
        </div>
    )
}

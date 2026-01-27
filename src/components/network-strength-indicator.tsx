
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NetworkStrengthIndicatorProps {
  referralCount: number;
  showDetailedDescription?: boolean;
}

export function NetworkStrengthIndicator({ referralCount, showDetailedDescription = true }: NetworkStrengthIndicatorProps) {
  const levels = [
    { label: "Very Weak", color: "text-red-400" },
    { label: "Weak", color: "text-orange-400" },
    { label: "Fair", color: "text-yellow-400" },
    { label: "Good", color: "text-lime-400" },
    { label: "Very Good", color: "text-green-400" },
    { label: "Strong", color: "text-emerald-400" },
  ];

  const currentLevelIndex = Math.min(referralCount, 5);
  const progressPercentage = (currentLevelIndex / (levels.length - 1)) * 100;
  const currentStatus = levels[currentLevelIndex];

  return (
    <Card className="futuristic-card-bg-secondary">
      <CardHeader>
        <CardTitle className="text-amber-200">Network Strength</CardTitle>
        <div className="relative w-full h-8 my-4">
          {/* Background Track */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-slate-700 rounded-full" />

          {/* Progress Bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
          
          {/* Dots */}
          <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between items-center">
            {levels.map((level, index) => {
              const isActive = index <= currentLevelIndex;
              return (
                <div key={index} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300",
                      isActive ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" : "bg-slate-600"
                    )}
                  />
                  <span
                    className={cn(
                      "absolute top-6 text-[10px] font-medium transition-colors duration-300",
                      isActive ? level.color : "text-muted-foreground"
                    )}
                  >
                    {level.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {showDetailedDescription && (
            <CardDescription className="text-amber-300/70 space-y-2 pt-4">
            <p>
                Your withdrawal eligibility depends on your network strength.
                Current Status: <span className={cn("font-bold", currentStatus.color)}>{currentStatus.label}</span>
            </p>
            <p className="text-xs pt-2 border-t border-amber-400/10">
                To ensure coin stability, KYC slots and fund transfers will be released in phases. A stronger network gives you higher priority. Users with a 'Strong' network (5+ referrals) will be in the first phase, while others will follow based on their status. However, referrals are not mandatory for coin withdrawal.
            </p>
            </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* Content can be added here if needed in the future */}
      </CardContent>
    </Card>
  );
}

"use client";

import { Coins } from "lucide-react";

interface WinningsAnimationProps {
    amount: number;
}

export function WinningsAnimation({ amount }: WinningsAnimationProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="animate-float-up flex flex-col items-center">
                <span className="text-4xl font-bold text-yellow-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    +{amount}
                </span>
                <Coins className="w-10 h-10 text-yellow-400" />
            </div>
        </div>
    );
}

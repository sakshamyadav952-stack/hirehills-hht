
'use client';

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OnlineStatusIndicator() {
  const isOnline = useOnlineStatus();
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredMessage(false); // Hide any lingering restored message
    } else if (isOnline && wasOffline) {
      setShowRestoredMessage(true);
      const timer = setTimeout(() => {
        setShowRestoredMessage(false);
        setWasOffline(false); // Reset wasOffline so the message doesn't reappear on subsequent renders
      }, 2000); // Hide after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 p-2 text-sm text-white transition-transform duration-300",
          !isOnline ? "translate-y-0" : "-translate-y-full",
          "bg-red-600"
        )}
      >
        <WifiOff className="h-4 w-4" />
        <span>Connection lost. Please check your internet connection.</span>
      </div>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 p-2 text-sm text-white transition-all duration-300",
          showRestoredMessage ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
          "bg-green-600"
        )}
      >
        <Wifi className="h-4 w-4" />
        <span>Connection restored. You are back online.</span>
      </div>
    </>
  );
}

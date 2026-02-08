
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Pickaxe, Play, Loader2, LogIn, Check, X, Info, Coins, Clapperboard, Gift, Clock, Zap, MessageSquare, User, AtSign, Trash2, Pyramid, Download } from "lucide-react";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from './ui/dialog';
import { SpinWheel } from "@/components/spin-wheel";
import { MysteryBox } from "@/components/mystery-box";
import { useRouter } from "next/navigation";
import { DailyQuote } from "./daily-quote";
import { SpinningWheelIcon } from "./spinning-wheel-icon";
import { MiningAnimationV2 } from "./mining-animation-v2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useFirestore } from "@/firebase";
import { doc, onSnapshot, getDocs, query, where, collection, Firestore } from "firebase/firestore";
import type { UniversalMessage, WithdrawalRequest, DailyAdCoin, UserProfile, KuberBlock } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ToastProvider, SwipeableAlert, SwipeableAlertTitle, SwipeableAlertDescription, SwipeableAlertClose } from "@/components/ui/swipeable-alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { FacebookIcon, XIcon } from "./icons/social-icons";
import { FeedbackDialog } from "./feedback-dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { PotentialEarningsDialog } from "./potential-earnings-dialog";
import { AirdropCard } from './airdrop-card';


function UniversalMessageNotification() {
    const firestore = useFirestore();
    const [messageData, setMessageData] = useState<{ text: string; updatedAt: any } | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [lastDismissedTimestamp, setLastDismissedTimestamp] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('dismissedUniversalMessageTimestamp');
            return stored ? Number(stored) : null;
        }
        return null;
    });
    
    const show = useMemo(() => {
        if (!messageData?.text || isDismissed) {
            return false;
        }
        const messageTimestamp = messageData.updatedAt?.seconds;
        if (!messageTimestamp) {
            return true; // Show if timestamp is missing
        }
        if (lastDismissedTimestamp === null || messageTimestamp > lastDismissedTimestamp) {
            return true;
        }
        return false;
    }, [messageData, isDismissed, lastDismissedTimestamp]);


    const handleDismiss = useCallback(() => {
        if (messageData?.updatedAt?.seconds) {
            const timestampToStore = messageData.updatedAt.seconds;
            localStorage.setItem('dismissedUniversalMessageTimestamp', String(timestampToStore));
            setLastDismissedTimestamp(timestampToStore);
        }
        setIsDismissed(true);
    }, [messageData]);

    useEffect(() => {
        if (!firestore) return;

        const unsub = onSnapshot(doc(firestore, 'universal_messages', 'current'), (doc) => {
            if (doc.exists() && doc.data().text) {
                const data = doc.data() as UniversalMessage;
                 const messageTimestamp = data.updatedAt?.seconds;
                const lastDismissed = typeof window !== 'undefined' ? Number(localStorage.getItem('dismissedUniversalMessageTimestamp')) : null;

                if (!lastDismissed || (messageTimestamp && messageTimestamp > lastDismissed)) {
                    setMessageData({ text: data.text, updatedAt: data.updatedAt });
                    setIsDismissed(false);
                } else if (!messageData || (messageTimestamp && messageData.updatedAt?.seconds < messageTimestamp)) {
                    setMessageData({ text: data.text, updatedAt: data.updatedAt });
                    if(lastDismissed && messageTimestamp && messageTimestamp > lastDismissed){
                        setIsDismissed(false);
                    } else {
                        setIsDismissed(true);
                    }
                }
            } else {
                setMessageData(null);
            }
        });
        return () => unsub();
    }, [firestore, messageData]);


    if (!show) {
        return null;
    }

    return (
        <ToastProvider>
            <SwipeableAlert 
                open={show}
                onOpenChange={(open) => { if (!open) handleDismiss(); }} 
                onSwipeEnd={handleDismiss}
                className="text-white border-amber-400/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative"
            >
                <div className="grid gap-1">
                    <SwipeableAlertTitle className="text-amber-300 flex items-center gap-2">
                         <MessageSquare className="h-4 w-4" /> Message from Admin
                    </SwipeableAlertTitle>
                    <SwipeableAlertDescription>{messageData?.text}</SwipeableAlertDescription>
                </div>
                <SwipeableAlertClose onClick={handleDismiss} />
            </SwipeableAlert>
        </ToastProvider>
    );
}

function UserNotifications() {
    const { userProfile, clearUserNotifications } = useAuth();
    const notifications = userProfile?.notifications;

    if (!notifications || notifications.length === 0) {
        return null;
    }

    return (
        <ToastProvider>
            <SwipeableAlert onSwipeEnd={clearUserNotifications} open={true} onOpenChange={(open) => !open && clearUserNotifications()}>
                <div className="grid gap-1">
                    <SwipeableAlertTitle>Notifications</SwipeableAlertTitle>
                    <SwipeableAlertDescription>
                         <ul className="list-disc list-inside">
                            {notifications.map((notif, index) => (
                                <li key={index}>{notif}</li>
                            ))}
                        </ul>
                    </SwipeableAlertDescription>
                </div>
                 <SwipeableAlertClose onClick={clearUserNotifications} />
            </SwipeableAlert>
        </ToastProvider>
    );
}

function RateProposalNotification() {
    const { userProfile, respondToRateProposal } = useAuth();
    
    const proposedRequest = useMemo(() => {
        return userProfile?.withdrawalRequests?.find(req => req.rateStatus === 'proposed');
    }, [userProfile?.withdrawalRequests]);

    if (!proposedRequest) {
        return null;
    }

    const { requestId, rateAmount, rateCurrency, rateBlistreeCoins } = proposedRequest;

    return (
        <Alert variant="default" className="mb-4">
             <AlertTitle>New Withdrawal Rate Proposal</AlertTitle>
             <AlertDescription>
                <p>
                    Admin has proposed a rate of <span className="font-bold">{rateAmount} {rateCurrency?.toUpperCase()}</span> for <span className="font-bold">{rateBlistreeCoins} Blistree</span>.
                </p>
                <div className="flex justify-end gap-2 mt-4">
                    <Button size="sm" variant="destructive" onClick={() => respondToRateProposal(requestId, false)}>Deny</Button>
                    <Button size="sm" variant="secondary" onClick={() => respondToRateProposal(requestId, true)}>Accept</Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}

const MissedCoinItem = ({ coin, onClaim, claimAttemptCooldown, onClaimAttempt }: { coin: DailyAdCoin, onClaim: (coinId: string, adElement: string) => void, claimAttemptCooldown: boolean, onClaimAttempt: () => void }) => {
  const { userProfile } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [isAndroidApp, setIsAndroidApp] = useState(false);

  useEffect(() => {
    setIsAndroidApp(typeof window.Android !== 'undefined');
  }, []);

  useEffect(() => {
    if (!userProfile?.lastMissedCoinClaimTimestamp) {
        setCooldownRemaining(0);
        return;
    }

    const cooldownEndTime = userProfile.lastMissedCoinClaimTimestamp + 60 * 60 * 1000; // 1 hour

    const updateCooldown = () => {
        const now = Date.now();
        const remaining = Math.max(0, cooldownEndTime - now);
        setCooldownRemaining(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [userProfile?.lastMissedCoinClaimTimestamp]);

  const handleClaim = async () => {
    setIsClaiming(true);
    onClaimAttempt(); // Trigger the 20-second UI cooldown
    await onClaim(coin.id, `Missed Coin ${coin.id}`);
    // isClaiming will remain true as the dialog closes on success
  };
  
    const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if(hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isButtonDisabled = isClaiming || cooldownRemaining > 0 || !isAndroidApp || claimAttemptCooldown;

  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-slate-800/60 border-amber-400/20">
        <div>
            <p className="font-medium text-amber-200">Missed coin</p>
            <p className="text-xs text-muted-foreground">Claim now by watching an ad.</p>
        </div>
        <Button size="sm" onClick={handleClaim} disabled={isButtonDisabled} className="bg-amber-500 text-black hover:bg-amber-400">
            {isClaiming 
                ? <Loader2 className="h-4 w-4 animate-spin" /> 
                : cooldownRemaining > 0
                ? `Wait ${formatTime(cooldownRemaining)}`
                : !isAndroidApp
                ? "App Only"
                : claimAttemptCooldown
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Claim'}
        </Button>
    </div>
  );
};


function DailyCoins({ isSessionActive }: { isSessionActive: boolean }) {
  const { dailyAdCoins, collectDailyAdCoin, claimMissedAdCoin } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [showClaimConfirmation, setShowClaimConfirmation] = useState(false);
  const [claimedCoinAmount, setClaimedCoinAmount] = useState<number | null>(null);
  const [claimAttemptCooldown, setClaimAttemptCooldown] = useState(false);
  const [availableCoins, setAvailableCoins] = useState<DailyAdCoin[]>([]);
  const [missedCoins, setMissedCoins] = useState<DailyAdCoin[]>([]);
  const [nextPendingCoin, setNextPendingCoin] = useState<DailyAdCoin | null>(null);
  const [nextCoinTime, setNextCoinTime] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if(hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    const allCoins = dailyAdCoins || [];
    const now = currentTime;

    const available: DailyAdCoin[] = [];
    const missed: DailyAdCoin[] = [];
    const pending: DailyAdCoin[] = [];

    allCoins.forEach(coin => {
      if (coin.status === 'collected') return;

      if (coin.finalExpiryAt && now >= coin.finalExpiryAt) {
          return;
      }

      if (now >= coin.availableAt && now < coin.expiresAt) {
        available.push(coin);
      } else if (now >= coin.expiresAt) {
        missed.push(coin);
      } else {
        pending.push(coin);
      }
    });

    setAvailableCoins(available);
    setMissedCoins(missed);
    
    pending.sort((a,b) => a.availableAt - b.availableAt);
    let nextCoin = pending[0] || null;

    if (available.length > 0) {
        setNextCoinTime(`Available for: ${formatTime(available[0].expiresAt - now)}`);
    } else if (missed.length > 0 && isSessionActive) {
        setNextCoinTime('You have missed coins to claim!');
    } else if (nextCoin) {
        setNextCoinTime(`Next coin in: ${formatTime(nextCoin.availableAt - now)}`);
    } else {
        const schedule = ['08:00', '12:00', '16:00', '22:00'];
        const nowDate = new Date(now);
        let nextCoinTimeValue: Date | null = null;
        
        for (const time of schedule) {
            const [hour, minute] = time.split(':').map(Number);
            const potentialTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), hour, minute, 0, 0);
            if (potentialTime > nowDate) {
                nextCoinTimeValue = potentialTime;
                break;
            }
        }
        
        if (!nextCoinTimeValue) {
            const tomorrow = new Date(nowDate);
            tomorrow.setDate(nowDate.getDate() + 1);
            const [hour, minute] = schedule[0].split(':').map(Number);
            nextCoinTimeValue = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), hour, minute, 0, 0);
        }
        
        setNextCoinTime(`Next coin in: ${formatTime(nextCoinTimeValue.getTime() - now)}`);
        
        nextCoin = {
            id: 'next-scheduled',
            status: 'pending',
            availableAt: nextCoinTimeValue.getTime(),
            expiresAt: nextCoinTimeValue.getTime() + 30 * 60 * 1000
        };
    }
    setNextPendingCoin(nextCoin);
  }, [currentTime, dailyAdCoins, isSessionActive]);


  const handleCollect = async (coinId: string) => {
    if (!coinId || isClaiming) return;
    setIsClaiming(true);
    const claimedAmount = await collectDailyAdCoin(coinId);
    if(claimedAmount) {
        setClaimedCoinAmount(claimedAmount);
        setShowClaimConfirmation(true);
    }
    setIsClaiming(false);
  };
  
  const handleClaimMissed = async (coinId: string, adElement: string) => {
    const claimedAmount = await claimMissedAdCoin(coinId, adElement);
    if (claimedAmount) {
      setClaimedCoinAmount(claimedAmount);
      setShowClaimDialog(false); // Close the list dialog
      setTimeout(() => {
        setShowClaimConfirmation(true); // Show the confirmation dialog after 15 seconds
      }, 15000);
    }
  };

  const handleClaimAttempt = () => {
    setClaimAttemptCooldown(true);
    setTimeout(() => {
      setClaimAttemptCooldown(false);
    }, 20000); // 20 seconds
  };

  const renderActionButton = () => {
    if (availableCoins.length > 0) {
      return (
        <Button onClick={() => handleCollect(availableCoins[0].id)} disabled={isClaiming} className="w-full text-white font-bold shadow-lg border border-blue-400/50 hover:bg-blue-500 transition-all duration-150 transform hover:scale-105" style={{ backgroundColor: '#3180F5' }}>
          <Gift className="mr-2 h-5 w-5" />
          {isClaiming ? <Loader2 className="animate-spin" /> : `Collect Coin (${formatTime(availableCoins[0].expiresAt - currentTime)})`}
        </Button>
      );
    }
    if (isSessionActive && missedCoins.length > 0) {
      return (
        <Button onClick={() => setShowClaimDialog(true)} className="w-full bg-amber-500/80 text-amber-50 font-bold shadow-lg border border-amber-400/50 hover:bg-amber-500 transition-all duration-150 transform hover:scale-105">
          <Coins className="mr-2 h-5 w-5" />
          Claim Missed Coins ({missedCoins.length})
        </Button>
      );
    }
    
    return null;
  };

  const CircuitNumber = ({ number }: { number: number }) => (
    <svg viewBox="0 0 80 120" className="w-14 h-20" style={{ filter: "drop-shadow(0 0 10px #ffc107)" }}>
      <defs>
        <linearGradient id="circuit-glow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffee77" />
          <stop offset="100%" stopColor="#ffc107" />
        </linearGradient>
      </defs>
      <text
        x="40"
        y="80"
        fontFamily="sans-serif"
        fontSize="100"
        fontWeight="bold"
        fill="url(#circuit-glow)"
        textAnchor="middle"
      >
        {number}
      </text>
    </svg>
  );

  const showNextCoinInfo = availableCoins.length === 0 && nextPendingCoin;

  return (
      <div className="relative rounded-xl p-4 text-white overflow-hidden bg-black/30 backdrop-blur-sm" style={{ boxShadow: 'inset 0 0 0 1px #4a4a6a, 0 0 20px rgba(74, 74, 106, 0.5)' }}>
        <div className="absolute inset-0 bg-grid-amber-300/10 [mask-image:radial-gradient(ellipse_at_center,white_20%,transparent_70%)]"></div>
        <div className="absolute -inset-1 rounded-xl border-2 border-transparent" style={{ background: 'linear-gradient(135deg, #00d9ff, #c002ff) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}></div>
        
        <div className="relative z-10 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div>
                <CardTitle className="text-lg font-bold text-amber-300 flex items-center gap-2">
                    <Clock className="h-5 w-5"/>
                    Daily Coins
                </CardTitle>
                <CardDescription className="text-cyan-300/80 text-xs mt-1">
                    {nextCoinTime}
                </CardDescription>
                </div>
            </div>
            
            <div className="flex-grow flex items-center justify-center min-h-[8rem]">
                {availableCoins.length > 0 ? (
                    <div className="text-center">
                        <CircuitNumber number={availableCoins.length} />
                    </div>
                ) : showNextCoinInfo ? (
                    <div className="text-center">
                        <p className="text-xl font-bold text-amber-300" style={{ textShadow: "0 0 8px rgba(251, 191, 36, 0.7)" }}>Next Coin</p>
                        <p className="text-2xl font-bold text-white mt-1">
                            {new Date(nextPendingCoin.availableAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                    </div>
                ) : null}
            </div>


            <div className="flex-shrink-0 pt-4">
                {renderActionButton()}
            </div>
        </div>

        <AlertDialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
             <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-amber-300">Claim Your Missed Coins</AlertDialogTitle>
                    <AlertDialogDescription className="text-amber-200/80">
                        You missed collecting these coins. You can claim them now by watching an ad. Missed coins expire 48 hours after they become available.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mt-4">
                    {missedCoins.map(coin => (
                        <MissedCoinItem key={coin.id} coin={coin} onClaim={handleClaimMissed} claimAttemptCooldown={claimAttemptCooldown} onClaimAttempt={handleClaimAttempt} />
                    ))}
                </div>
                <AlertDialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setShowClaimDialog(false)} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Close</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showClaimConfirmation} onOpenChange={setShowClaimConfirmation}>
            <AlertDialogContent className="text-white border-green-400/50" style={{ background: 'linear-gradient(145deg, #1a2e2e, #163e3e)' }}>
                <AlertDialogHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4 border-2 border-green-500/50">
                        <Check className="h-8 w-8 text-green-400" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-green-300">Coin Claimed!</AlertDialogTitle>
                    <AlertDialogDescription className="text-green-200/80">
                        You have successfully claimed {claimedCoinAmount} BLIT coin. It has been added to your wallet.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4">
                    <AlertDialogAction onClick={() => {
                        setShowClaimConfirmation(false);
                    }} className="w-full bg-green-500 text-white hover:bg-green-600">
                        Awesome!
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}

function CrushOracleCard() {
  const { userProfile, creditCrushOracleInstall } = useAuth();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleInstallClick = async () => {
    if (isClaiming) return;

    window.open('https://play.google.com/store/apps/details?id=com.crushoracle.app', '_blank');
    
    if (userProfile?.crushOracleInstalled) {
      return;
    }

    setIsClaiming(true);
    try {
      await creditCrushOracleInstall();
    } catch (e) {
      // Error is handled by toast in the auth hook
    } finally {
      // The button will be disabled via snapshot update, but let's reset loading state for responsiveness
      setTimeout(() => setIsClaiming(false), 2000);
    }
  };

  const isInstalled = userProfile?.crushOracleInstalled === true;

  return (
    <Card className="text-white border-purple-400/50 bg-gradient-to-br from-purple-900/50 to-rose-900/30">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-400/50 flex-shrink-0">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/icon.png?alt=media&token=d58a68e6-fc86-4614-b288-151d96b972ae"
              alt="CrushOracle Icon"
              width={64}
              height={64}
              className="transform scale-125"
            />
        </div>
        <div>
          <CardTitle className="text-purple-300">CrushOracle</CardTitle>
          <CardDescription className="text-rose-200/80">Turn Feelings into Clarity</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm mb-4">
          Install our new app and get <span className="font-bold text-amber-300">10 BLIT</span> instantly!
        </p>
        <Button
          onClick={handleInstallClick}
          disabled={isInstalled || isClaiming}
          className="w-full bg-rose-500 text-white font-bold shadow-lg border-b-4 border-rose-800 hover:bg-rose-600 active:border-b-0"
        >
          {isInstalled ? (
            <>
              <Check className="mr-2 h-5 w-5" />
              Reward Claimed
            </>
          ) : isClaiming ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              Get it on Google Play
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}


function maskEmail(email: string) {
  if (!email || !email.includes('@')) return "Invalid Email";
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.substring(0, 2)}***@${domain}`;
}

function maskMobile(mobile: string) {
    if (!mobile || mobile.length < 4) return "Invalid Number";
    return `******${mobile.slice(-4)}`;
}

export function MiningDashboard() {
  const { userProfile, updateMiningState, loading, liveCoins, claimMinedCoins, getGlobalSessionDuration, adminTerminateUserSession, requestFollow, deleteAccount, isFinalizing } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isAndroidApp, setIsAndroidApp] = useState(false);
  const [showPotentialEarnings, setShowPotentialEarnings] = useState(false);
  const firestore = useFirestore();

  const [isClaiming, setIsClaiming] = useState(false);
  const [isStartingMining, setIsStartingMining] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [claimedAmountForFeedback, setClaimedAmountForFeedback] = useState(0);
  const [followPlatform, setFollowPlatform] = useState<'facebook' | 'x' | null>(null);
  const [profileName, setProfileName] = useState('');
  const [showDeviceConflictDialog, setShowDeviceConflictDialog] = useState(false);
  const [conflictingAccounts, setConflictingAccounts] = useState<Partial<UserProfile>[]>([]);
  const [cumulativeFBloc, setCumulativeFBloc] = useState(0);
  const animationFrameRef = useRef<number>();
  
  const isSessionActive = useMemo(() => {
      if (!userProfile?.sessionEndTime) return false;
      return Date.now() < userProfile.sessionEndTime;
  }, [userProfile?.sessionEndTime]);

  const displayCoins = useMemo(() => {
    if (isSessionActive) {
      return liveCoins;
    }
    if (userProfile?.unclaimedCoins && userProfile.unclaimedCoins > 0) {
      return userProfile.unclaimedCoins;
    }
    return 0;
  }, [isSessionActive, liveCoins, userProfile?.unclaimedCoins]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAndroidApp(typeof window.Android !== 'undefined');
    }
  }, []);

  const formatTime = (ms: number) => {
    if (ms < 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (isSessionActive && userProfile?.sessionEndTime) {
        const updateTimer = () => {
            const now = Date.now();
            const remainingMs = userProfile.sessionEndTime! - now;
            if (remainingMs > 0) {
                setTimeRemaining(formatTime(remainingMs));
            } else {
                setTimeRemaining('00:00:00');
                clearInterval(interval);
                // The session end and coin finalization is handled by a listener in `useAuth`
                // to ensure it happens reliably even if the component isn't mounted.
            }
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);
    } else if (userProfile?.unclaimedCoins && userProfile.unclaimedCoins > 0) {
        if (userProfile.miningStartTime && userProfile.sessionEndTime) {
            const duration = userProfile.sessionEndTime - userProfile.miningStartTime;
            setTimeRemaining(formatTime(duration));
        } else {
             setTimeRemaining('00:00:00');
        }
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isSessionActive, userProfile?.sessionEndTime, userProfile?.unclaimedCoins, userProfile?.miningStartTime, liveCoins]);


  const handleStartMining = useCallback(async () => {
    if (!userProfile) {
      router.push('/auth/login');
      return;
    }
    if (isSessionActive || isStartingMining) return;
    if (userProfile.unclaimedCoins && userProfile.unclaimedCoins > 0) {
        toast({
            title: "Claim Required",
            description: "You must claim your previously mined coins before starting a new session.",
            variant: "destructive"
        });
        return;
    }

    setIsStartingMining(true);
    try {
        const durationInMinutes = await getGlobalSessionDuration();
        const now = Date.now();
        const endTime = now + durationInMinutes * 60 * 1000;
        await updateMiningState(now, endTime);
    } catch (error) {
        console.error("Error starting mining session:", error);
        toast({ title: 'Error', description: 'Could not start mining session.', variant: 'destructive' });
    } finally {
        setIsStartingMining(false);
    }
  }, [userProfile, isSessionActive, isStartingMining, toast, router, getGlobalSessionDuration, updateMiningState]);

  const handleClaimCoins = useCallback(async () => {
    if (!userProfile || !userProfile.unclaimedCoins || userProfile.unclaimedCoins <= 0 || isClaiming) return;
    
    setIsClaiming(true);
    // Add a 1-second delay
    setTimeout(async () => {
        const claimedAmount = await claimMinedCoins();
        if (claimedAmount !== undefined) {
            setClaimedAmountForFeedback(claimedAmount);
            setShowFeedbackDialog(true);
        }
        setIsClaiming(false);
    }, 1000);

  }, [userProfile, isClaiming, claimMinedCoins]);
  
  const handleTerminateSession = async () => {
    if (!userProfile) return;
    setIsTerminating(true);
    try {
        await adminTerminateUserSession(userProfile.id);
        toast({ title: "Session Terminated", description: "Your mining session has been ended."});
    } catch (error: any) {
        // Error toast is handled in the hook
    } finally {
        setIsTerminating(false);
    }
  };
    
    const handleWatchAd = () => {
        if (window.Android && typeof window.Android.showRewardedAd === 'function') {
            window.Android.showRewardedAd();
        } else {
            toast({
                title: "Feature not available",
                description: "This feature is only available on our Android app.",
                variant: "destructive",
            });
        }
    };
    
    const handleFollowClick = (platform: 'facebook' | 'x') => {
        setFollowPlatform(platform);
    };

    const handleFollowProceed = () => {
        if (!followPlatform || !profileName.trim()) {
            toast({ title: "Profile Name Required", description: "Please enter your profile name.", variant: "destructive" });
            return;
        }

        const url = followPlatform === 'facebook'
          ? "https://www.facebook.com/profile.php?id=61584376044607"
          : "https://twitter.com/Blistreetokens";
        
        window.open(url, '_blank');
        requestFollow(followPlatform, profileName);
        setFollowPlatform(null);
        setProfileName('');
    };

    useEffect(() => {
        const kuberBlocks = userProfile?.kuberBlocks;
        if (!kuberBlocks || kuberBlocks.length === 0) {
            setCumulativeFBloc(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            return;
        }

        const tBlocRatePerMs = 0.25 / (1000 * 60 * 60);

        const animate = () => {
            const now = Date.now();
            let total = 0;

            kuberBlocks.forEach(block => {
                const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
                const durationHours = durationMs / (1000 * 60 * 60);
                const totalKuberPoints = durationHours * 0.25;
                
                const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
                const currentSimulatedPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);
                
                total += currentSimulatedPoints;
            });

            setCumulativeFBloc(total);

            // Only continue animating if there are active calculations
            const isStillAnimating = kuberBlocks.some(block => {
                const totalKuberPoints = (Math.max(0, block.referralSessionEndTime - block.userSessionStartTime) / (1000 * 60 * 60)) * 0.25;
                const elapsedMsSinceStart = Math.max(0, now - block.userSessionStartTime);
                const currentSimulatedPoints = Math.min(elapsedMsSinceStart * tBlocRatePerMs, totalKuberPoints);
                return currentSimulatedPoints < totalKuberPoints;
            });
            
            if (isStillAnimating) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [userProfile?.kuberBlocks]);

    const getFollowButton = (platform: 'facebook' | 'x') => {
        const platformKey = platform === 'facebook' ? 'followStatusFacebook' : 'followStatusX';
        const status = userProfile?.[platformKey];
        const Icon = platform === 'facebook' ? FacebookIcon : XIcon;

        const handleClick = () => {
            if (status === 'followed') {
                const url = platform === 'facebook'
                    ? "https://www.facebook.com/profile.php?id=61584376044607"
                    : "https://twitter.com/Blistreetokens";
                window.open(url, '_blank');
            } else {
                handleFollowClick(platform);
            }
        };

        return (
            <Button onClick={handleClick} variant="outline" className="w-full justify-between bg-blue-600/10 border-blue-500/30 text-white hover:bg-blue-600/20 hover:text-white" disabled={status === 'pending'}>
                <div className="flex items-center gap-2">
                    <Icon />
                    <span className="ml-2">Follow on {platform === 'facebook' ? 'Facebook' : 'X'}</span>
                </div>
                {status === 'followed' ? (
                     <span className="font-bold text-sm flex items-center gap-1 text-green-400">
                        <Check className="h-4 w-4"/>
                        Following
                    </span>
                ) : status === 'pending' ? (
                     <span className="font-bold text-sm flex items-center gap-1">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Pending
                    </span>
                ) : (
                    <span className="font-bold text-sm">+10 BLIT</span>
                )}
            </Button>
        );
    };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[calc(100vh-8rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!userProfile) {
    return (
        <div className="grid gap-6 rounded-lg p-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold">Welcome to Blistree Tokens</h2>
                <p className="text-muted-foreground">Your adventure in digital currency awaits. Log in to start your mining journey and see your fortune grow.</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
                <Pickaxe className="h-24 w-24 text-primary" />
                <Button asChild size="lg">
                    <Link href="/auth/login">
                        <LogIn className="mr-2 h-5 w-5" />
                        Login to Start Mining
                    </Link>
                </Button>
                <p className="px-8 text-center text-sm text-muted-foreground">
                  By logging in, you agree to our{' '}
                  <Link href="/privacy-policy" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                  </Link>
                  .
                </p>
            </div>
        </div>
    )
  }

  const spinsAvailable = (userProfile.spinCount || 0) < 2;
  const inCooldown = userProfile.spinCooldownEnd ? Date.now() < userProfile.spinCooldownEnd : false;
  const showSpinIcon = isSessionActive && spinsAvailable && !inCooldown;
  
  const renderActionButton = () => {
    if (isStartingMining) {
        return (
            <div className="flex flex-col items-center">
                <button
                    disabled
                    className="w-24 h-24 rounded-full border-4 border-primary/50 flex items-center justify-center relative shadow-[0_0_20px] shadow-primary/50"
                >
                    <div className="w-20 h-20 rounded-full border-2 border-primary/80 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs font-semibold text-primary mt-1">Starting...</span>
                    </div>
                </button>
            </div>
        );
    }

    if (isSessionActive) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full border-4 border-amber-400/50 flex items-center justify-center relative shadow-[0_0_20px] shadow-amber-400/50">
            <div className="w-20 h-20 rounded-full border-2 border-amber-400/80 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-xs text-amber-300 mt-1">Mining...</span>
            </div>
          </div>
          {userProfile.isAdmin && (
            <Button onClick={handleTerminateSession} disabled={isTerminating} size="sm" variant="destructive" className="mt-2">
                {isTerminating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                Terminate
            </Button>
          )}
        </div>
      );
    }
  
    if (isFinalizing || (userProfile.unclaimedCoins && userProfile.unclaimedCoins > 0 && isClaiming)) {
        return (
            <div className="flex flex-col items-center justify-center h-24 w-24">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs text-amber-300 mt-2">{isClaiming ? 'Claiming...' : 'Finalizing...'}</span>
            </div>
        );
    }

    if (userProfile.unclaimedCoins && userProfile.unclaimedCoins > 0) {
      return (
        <div className="flex flex-col items-center">
            <Button size="lg" onClick={handleClaimCoins} disabled={isClaiming} className="bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px] shadow-amber-500/80">
              {isClaiming ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Coins className="mr-2 h-5 w-5" />}
              Claim Coins
            </Button>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center">
          <button
              onClick={handleStartMining}
              className={cn("w-24 h-24 rounded-full border-4 border-primary/50 flex items-center justify-center relative shadow-[0_0_20px] shadow-primary/50 transition-colors cursor-pointer hover:bg-primary/10")}
          >
              <div className="w-20 h-20 rounded-full border-2 border-primary/80 flex flex-col items-center justify-center">
                  <Play className="w-8 h-8 text-primary" />
                  <span className="text-sm font-semibold text-primary mt-1">Start</span>
              </div>
          </button>
      </div>
    );
  };

  return (
    <div className={cn("grid", "mining-background")}>
      <PotentialEarningsDialog open={showPotentialEarnings} onOpenChange={setShowPotentialEarnings} userProfile={userProfile} />
      <FeedbackDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog} claimedAmount={claimedAmountForFeedback} />
       <AlertDialog open={showDeviceConflictDialog} onOpenChange={setShowDeviceConflictDialog}>
        <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-amber-300">Device Already in Use</AlertDialogTitle>
                <AlertDialogDescription className="text-amber-200/80">
                    This device is associated with another account. To prevent abuse, each device can only be used for one mining account.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 space-y-2">
                <p className="text-sm font-semibold text-amber-200/90">Conflicting Account(s):</p>
                <ul className="space-y-1 text-sm text-amber-200/80 list-disc list-inside">
                    {conflictingAccounts.map(acc => (
                        <li key={acc.id}>
                           {acc.fullName} ({acc.profileCode})
                        </li>
                    ))}
                </ul>
            </div>
            <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => {setShowDeviceConflictDialog(false); router.push('/chat');}} className="sm:col-span-1 bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white">
                    <MessageSquare className="mr-2 h-4 w-4" /> Support
                </Button>
                <AlertDialogCancel className="sm:col-span-1">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteAccount()} className="sm:col-span-1 bg-destructive hover:bg-destructive/90">
                    <Trash2 className="mr-2 h-4 w-4"/>
                    Delete This Account
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="relative z-10 px-4 md:px-6 space-y-4">
        <UniversalMessageNotification />
        <UserNotifications />
        <RateProposalNotification />
      </div>

      <div
        className="relative sm:rounded-3xl sm:border border-amber-500/30 bg-transparent backdrop-blur-sm p-6 text-white shadow-[0_0_30px] shadow-amber-500/20 overflow-hidden"
      >
        <Image
          src='https://firebasestorage.googleapis.com/v0/b/studio-7279145746-e15dc.firebasestorage.app/o/Mining_card_image.jpeg?alt=media&token=440c3300-59bd-4735-ab18-96109187c453'
          alt="Abstract background"
          fill
          priority
          quality={75}
          className="object-cover"
        />
        {/* Decorative circuit lines */}
        <div className="absolute top-4 left-4 w-1/3 h-1/3 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl"></div>
        <div className="absolute bottom-4 right-4 w-1/3 h-1/3 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="absolute w-full h-full text-amber-500/30" viewBox="0 0 100 100">
                <path d="M50 0 L93.3 25 L93.3 75 L50 100 L6.7 75 L6.7 25 Z" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              <Coins className="w-8 h-8 text-amber-400" />
            </div>
            <Link href="/referrals" className="flex flex-col items-end cursor-pointer">
                <div className="flex items-center gap-2">
                    <Pyramid className="h-4 w-4 text-indigo-300" />
                    <span className="font-mono text-lg font-bold text-indigo-300">{cumulativeFBloc.toFixed(4)}</span>
                </div>
                <p className="text-xs text-indigo-200/80">From referrals</p>
            </Link>
          </div>

          <div className="text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-amber-400 tracking-tighter" style={{textShadow: '0 0 10px rgba(251, 191, 36, 0.5)'}}>
                {displayCoins.toFixed(4)}
            </h2>
            <p className="text-sm text-gray-300 mt-2">
              {isSessionActive ? "Blistree Tokens Earned This Session" : (userProfile.unclaimedCoins || 0) > 0 ? "Coins Ready to Claim" : "Start Mining"}
            </p>
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <span>Total Balance: {(userProfile.minedCoins || 0).toFixed(4)}</span>
                <span className="font-sans font-bold">₿</span>
            </p>
          </div>

          <div className="flex justify-between items-end gap-4">
            <div className="bg-black/30 rounded-lg p-2 px-4 border border-white/20">
              <p className="text-2xl font-mono text-amber-400" style={{textShadow: '0 0 8px rgba(251, 191, 36, 0.7)'}}>
                {timeRemaining}
              </p>
            </div>
             <div>
               {renderActionButton()}
            </div>
          </div>
        </div>
      </div>


      {/* Other Sections */}
      <div className="grid gap-6 mt-6 px-4 md:px-6 pb-24">
        
        <AirdropCard />

        {isSessionActive && userProfile.adsUnlocked && <DailyCoins isSessionActive={isSessionActive} />}

        <Card className="text-white border-amber-400/50 bg-slate-900/50">
            <CardHeader>
                <CardTitle className="text-amber-300">Mystery Boxes</CardTitle>
                <CardDescription className="text-amber-200/80">Open for a chance to boost your mining rate!</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <MysteryBox type="2H" userProfile={userProfile} isSessionActive={isSessionActive} />
                    <MysteryBox type="4H" userProfile={userProfile} isSessionActive={isSessionActive} />
                    <MysteryBox type="8H" userProfile={userProfile} isSessionActive={isSessionActive} />
                </div>
                {!isSessionActive && !(userProfile.unclaimedCoins && userProfile.unclaimedCoins > 0) && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                    Start mining to open boxes.
                </p>
                )}
            </CardContent>
        </Card>
        
        <CrushOracleCard />

        <Card className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
            <CardHeader>
                <CardTitle className="text-amber-300">Follow Us & Earn</CardTitle>
                <CardDescription className="text-amber-200/80">Get +10 BLIT coins for each follow! Stay updated with the latest news and announcements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {getFollowButton('facebook')}
               {getFollowButton('x')}
            </CardContent>
        </Card>

        <Card className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
            <CardHeader>
                <CardTitle className="text-amber-300 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Blistree Team Notice
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-amber-200/80">
                    Dear {userProfile.fullName},<br/><br/>
                    Mine as many coins as you can while the mining speed is high. We’ve capped the supply at 200 million coins and revoked the minting authority to ensure trust, scarcity, and long-term value. The mining rate will reduce later, so don’t miss this opportunity.
                </p>
            </CardContent>
        </Card>

        {!isMobile && (
          <Card className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
            <CardHeader>
              <CardTitle className="text-amber-300">Spin the Wheel!</CardTitle>
              <CardDescription className="text-amber-200/80">Spin for a chance to win bonus Blistree coins!</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                  disabled={!isSessionActive}
                  asChild
                  className="w-full bg-amber-500 text-black font-bold shadow-md border-b-4 border-amber-700 hover:bg-amber-400 active:border-b-0"
              >
                  <Link href="/spin-wheel">
                  {isSessionActive ? 'Spin for a prize!' : 'Start mining to spin'}
                  </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-24">
          <DailyQuote />
        </div>
      </div>
      
      <Dialog open={!!followPlatform} onOpenChange={() => setFollowPlatform(null)}>
        <DialogContent className="text-white border-cyan-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
            <DialogHeader>
                <DialogTitle className="text-cyan-300 flex items-center gap-2">
                    <AtSign />
                    Confirm Your {followPlatform === 'facebook' ? 'Facebook' : 'X'} Profile
                </DialogTitle>
                <DialogDescription className="text-cyan-200/80 pt-2">
                    Please enter the name shown on your {followPlatform === 'facebook' ? 'Facebook' : 'X'} profile to help us verify your follow.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="profile-name" className="text-cyan-200/90">Profile Name</Label>
                <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder={`Your ${followPlatform === 'facebook' ? 'Facebook' : 'X'} profile name`}
                    className="bg-slate-900/50 border-cyan-400/30 text-white"
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setFollowPlatform(null)} className="bg-transparent text-cyan-300 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white">Close</Button>
                <Button onClick={handleFollowProceed} className="bg-cyan-500 text-black hover:bg-cyan-400">Proceed</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

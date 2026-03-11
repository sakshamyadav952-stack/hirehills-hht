'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useUser,
  useAuth as useFirebaseAuth,
  useFirestore,
} from '@/firebase';
import {
  signOut,
  deleteUser,
  User,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, onSnapshot, updateDoc, runTransaction, arrayUnion, query, collection, where, documentId, getDocs, writeBatch, deleteDoc, setDoc, getDoc, increment, addDoc, orderBy, Timestamp, arrayRemove, Firestore } from 'firebase/firestore';
import type { UserProfile, WithdrawalRequest, ActiveBoost, DailyAdCoin, AdWatchEvent, AirdropConfig, ChatMessage, KuberBlock, KuberRequest, KuberId, PendingTransfer, Transaction } from '@/lib/types';
import { useToast, toast as toastFn } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { translateText } from '@/ai/flows/translate-flow';

type CooldownType = '2H' | '4H' | '8H';
type Theme = 'light' | 'dark';

interface MiningRateBreakdown {
  base: number;
  boost: number;
  referral: number;
  appliedCode: number;
}

type ReferralWithEarnings = UserProfile & { 
  status: 'Active' | 'Inactive';
};

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  isSigningIn: boolean;
  isFinalizing: boolean;
  emailVerified: boolean;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  initializeRecaptcha: (container: HTMLElement) => void;
  signInWithPhoneNumber: (phoneNumber: string) => Promise<ConfirmationResult>;
  signInWithGoogle: () => Promise<void>;
  confirmOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  verifyPhoneNumber: (phoneNumber: string, container: HTMLElement) => Promise<ConfirmationResult>;
  confirmPhoneNumberVerification: (confirmationResult: ConfirmationResult, verificationCode: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPhoneNumber: (newMobileNumber: string) => Promise<void>;
  updateMiningState: (startTime: number | null, endTime: number | null) => Promise<void>;
  claimMinedCoins: () => Promise<number | undefined>;
  adminStartUserSession: (userId: string) => Promise<void>;
  adminTerminateUserSession: (userId: string) => Promise<void>;
  creditSpinWinnings: (winnings: number) => Promise<void>;
  applySpinWinnings: (finalWinnings: number, adWatched: boolean) => Promise<void>;
  updateMiningRate: (type: CooldownType, rateIncrease: number, adWatched: boolean) => void;
  applyReferralCode: (profileCode: string) => Promise<void>;
  adminApplyReferralCode: (referrerCode: string, refereeCode: string) => Promise<void>;
  transferCoins: (recipientId: string, recipientName: string, amount: number) => Promise<void>;
  respondToTransferByAdmin: (transferId: string, senderId: string, receiverId: string, amount: number, action: 'approve' | 'reject', comment?: string, transactionId?: string) => Promise<void>;
  sendNotificationToUser: (profileCode: string, message: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  adminDeleteChatMessage: (userId: string, messageId: string) => Promise<void>;
  adminClearOpenChats: () => Promise<void>;
  requestWithdrawal: (details: Partial<WithdrawalRequest>) => Promise<void>;
  adminUpdateUserCoins: (userId: string, amount: number) => Promise<void>;
  adminRemoveReferral: (userId: string, referralId: string) => Promise<void>;
  setGlobalBaseMiningRate: (newRate: number) => Promise<void>;
  getGlobalSessionDuration: () => Promise<number>;
  setGlobalSessionDuration: (minutes: number) => Promise<void>;
  grantBonusSpins: (spinCount: number) => Promise<void>;
  clearUserNotifications: () => void;
  sendUniversalMessage: (message: string) => Promise<void>;
  createSupportChatFromFeedback: (rating: number, feedback: string) => Promise<void>;
  setWithdrawalRate: (userId: string, requestId: string, rate: { amount: number; currency: 'inr' | 'usd'; blistreeCoins: number }) => Promise<void>;
  collectDailyAdCoin: (coinId: string) => Promise<number | undefined>;
  claimMissedAdCoin: (coinId: string, adElement: string) => Promise<number | undefined>;
  totalMiningRate: number;
  miningRateBreakdown: MiningRateBreakdown | null;
  liveCoins: number;
  allReferrals: ReferralWithEarnings[];
  activeReferrals: ReferralWithEarnings[];
  inactiveReferrals: ReferralWithEarnings[];
  referralsLoading: boolean;
  activeReferralsCount: number;
  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  respondToRateProposal: (requestId: string, accepted: boolean) => Promise<void>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  adCooldownEndTime: number | null;
  startAdCooldown: () => void;
  requestFollow: (platform: 'facebook' | 'x', profileName: string) => Promise<void>;
  approveFollowRequest: (userId: string, platform: 'facebook' | 'x') => Promise<void>;
  disapproveFollowRequest: (userId: string, platform: 'facebook' | 'x') => Promise<void>;
  adminSetFollowStatus: (userId: string, platform: 'facebook' | 'x', status: 'followed' | 'pending' | null) => Promise<void>;
  setUserHasRatedOnPlayStore: () => Promise<void>;
  canWatchAd: boolean;
  toast: typeof toastFn;
  updateAirdropConfig: (config: Partial<AirdropConfig>) => Promise<void>;
  respondToKuberRequest: (request: KuberRequest) => Promise<void>;
  clearKuberSessionLogs: () => Promise<void>;
  dailyAdCoins: DailyAdCoin[];
  t: (key: string) => string;
  setLanguage: (lang: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const generateAlphanumericCode = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const generateUniqueProfileCode = async (db: Firestore): Promise<string> => {
    let profileCode: string;
    let isUnique = false;
    const usersRef = collection(db, 'users');
    while (!isUnique) {
        profileCode = generateAlphanumericCode(6);
        const q = query(usersRef, where('profileCode', '==', profileCode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) isUnique = true;
    }
    return profileCode!;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [totalMiningRate, setTotalMiningRate] = useState(0.25);
  const [miningRateBreakdown, setMiningRateBreakdown] = useState<MiningRateBreakdown | null>(null);
  const [liveCoins, setLiveCoins] = useState(0);
  const [allReferrals, setAllReferrals] = useState<ReferralWithEarnings[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [adCooldownEndTime, setAdCooldownEndTime] = useState<number | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [canWatchAd, setCanWatchAd] = useState(true);
  const [dailyAdCoins, setDailyAdCoins] = useState<DailyAdCoin[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loading = isAuthLoading || isProfileLoading;
  const emailVerified = user?.emailVerified || false;

  const startAdCooldown = useCallback(() => {
    setAdCooldownEndTime(Date.now() + 15000);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof document !== 'undefined') {
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }
    if (user) {
      const userDocRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userDocRef, { theme: newTheme });
    }
  }, [user, firestore]);

  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('User not authenticated.');
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, data);
    } catch(e: any) {
        toast({ title: 'Update Failed', description: 'Could not update your profile.', variant: 'destructive' });
        throw e;
    }
  }, [user, firestore, toast]);

  const setLanguage = useCallback((lang: string) => {
    if (userProfile?.language !== lang) {
      localStorage.removeItem(`translations_${userProfile?.language}`);
      updateUserProfile({ language: lang });
    }
  }, [userProfile?.language, updateUserProfile]);

  const t = useCallback((key: string) => {
      return translations[key] || key;
  }, [translations]);

  const logout = useCallback(async () => { await signOut(auth); }, [auth]);

  const initializeRecaptcha = useCallback((container: HTMLElement) => {
    if (recaptchaVerifierRef.current) return;
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
    });
  }, [auth]);

  const signInWithPhoneNumber = useCallback(async (phoneNumber: string) => {
    if (!recaptchaVerifierRef.current) throw new Error('reCAPTCHA not initialized');
    return firebaseSignInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current);
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    if (typeof window !== 'undefined' && (window as any).AndroidApp?.startGoogleLogin) {
        (window as any).AndroidApp.startGoogleLogin();
        loginTimeoutRef.current = setTimeout(() => {
            setIsSigningIn(false); loginTimeoutRef.current = null;
            toast({ title: 'Sign-in Timeout', variant: 'destructive' });
        }, 20000);
    } else {
        router.push('/app-only'); setIsSigningIn(false);
    }
  }, [router, toast]);

  const confirmOtp = useCallback(async (confirmationResult: ConfirmationResult, otp: string) => {
    await confirmationResult.confirm(otp);
  }, []);

  const updateMiningState = useCallback(async (startTime: number | null, endTime: number | null = null) => {
    if (!user || !userProfile) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const dataToUpdate: { [key: string]: any } = { miningStartTime: startTime, sessionEndTime: endTime };
    if (startTime !== null) {
      dataToUpdate.spinCount = 0; dataToUpdate.spinCooldownEnd = null; dataToUpdate.adWatchHistory = [];
      dataToUpdate.sessionBaseEarnings = 0; dataToUpdate.sessionReferralEarnings = 0; dataToUpdate.sessionMissedCoinEarnings = 0;
    }
    await updateDoc(userDocRef, dataToUpdate);
  }, [user, userProfile, firestore]);

  const claimMinedCoins = useCallback(async (): Promise<number | undefined> => {
    if (!user) return;
    try {
        const claimFunction = httpsCallable(getFunctions(), 'claimMinedCoins');
        const result = await claimFunction();
        const data = result.data as { success: boolean; claimedAmount: number };
        return data.claimedAmount;
    } catch (error) {
        toast({ title: 'Claim Failed', variant: 'destructive' });
        return undefined;
    }
  }, [user, toast]);

  const updateMiningRate = useCallback(async (type: CooldownType, rateIncrease: number, adWatched: boolean) => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const hours = parseInt(type.replace('H', ''));
    const now = Date.now();
    const boost: ActiveBoost = {
        id: doc(collection(firestore, 'temp')).id,
        type,
        rate: rateIncrease,
        startTime: now,
        endTime: now + hours * 3600000,
        adWatched
    };
    await updateDoc(userDocRef, { activeBoosts: arrayUnion(boost) });
  }, [user, firestore]);

  const applyReferralCode = useCallback(async (profileCode: string) => {
    try {
        const applyFunction = httpsCallable(getFunctions(), 'applyReferralCode');
        await applyFunction({ referrerCode: profileCode });
        toast({ title: 'Code Applied' });
    } catch (error: any) {
        toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    }
  }, [toast]);

  const transferCoins = useCallback(async (recipientId: string, recipientName: string, amount: number) => {
    if (!user || !userProfile) throw new Error("Not signed in");
    const newTransactionRef = doc(collection(firestore, 'transactions'));
    const newPendingTransferRef = doc(collection(firestore, 'pendingTransfers'));
    await runTransaction(firestore, async (transaction) => {
        const senderDocRef = doc(firestore, 'users', user.uid);
        transaction.set(newTransactionRef, { senderId: user.uid, senderName: userProfile.fullName, receiverId: recipientId, receiverName: recipientName, amount, status: 'pending', createdAt: serverTimestamp() });
        transaction.update(senderDocRef, { minedCoins: increment(-amount), lastTransactionTimestamp: serverTimestamp() });
        transaction.set(newPendingTransferRef, { id: newPendingTransferRef.id, transactionId: newTransactionRef.id, senderId: user.uid, senderName: userProfile.fullName, receiverId: recipientId, receiverName: recipientName, amount, status: 'pending', createdAt: serverTimestamp() });
    });
    toast({ title: 'Transfer Sent' });
  }, [user, userProfile, firestore, toast]);

  const respondToTransferByAdmin = useCallback(async (transferId: string, senderId: string, receiverId: string, amount: number, action: 'approve' | 'reject', comment?: string, transactionId?: string) => {
    if (!transactionId) return;
    await runTransaction(firestore, async (transaction) => {
        if (action === 'approve') transaction.update(doc(firestore, 'users', receiverId), { minedCoins: increment(amount) });
        else transaction.update(doc(firestore, 'users', senderId), { minedCoins: increment(amount) });
        transaction.update(doc(firestore, 'transactions', transactionId), { status: action === 'approve' ? 'completed' : 'rejected', adminComment: comment, completedAt: serverTimestamp() });
        transaction.delete(doc(firestore, 'pendingTransfers', transferId));
    });
  }, [firestore]);

  const collectDailyAdCoin = useCallback(async (coinId: string): Promise<number | undefined> => {
    if (!user) return;
    try {
        const claimFunction = httpsCallable(getFunctions(), 'claimDailyCoin');
        const result = await claimFunction({ coinId, isMissed: false });
        const data = result.data as { success: boolean, claimedAmount: number };
        if (data.success) return data.claimedAmount;
    } catch(error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [user, toast]);

  const claimMissedAdCoin = useCallback(async (coinId: string, adElement: string): Promise<number | undefined> => {
    if (!user) return;
    try {
        const claimFunction = httpsCallable(getFunctions(), 'claimDailyCoin');
        const result = await claimFunction({ coinId, isMissed: true, adElement });
        const data = result.data as { success: boolean, claimedAmount: number };
        if (data.success) { startAdCooldown(); return data.claimedAmount; }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  }, [user, toast, startAdCooldown]);

  const creditSpinWinnings = useCallback(async (winnings: number) => {
    if (!user) return;
    await updateDoc(doc(firestore, 'users', user.uid), { spinWinnings: increment(winnings) });
  }, [user, firestore]);

  const applySpinWinnings = useCallback(async (finalWinnings: number, adWatched: boolean) => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const updatePayload: any = { 
        spinCount: increment(1),
        spinWinnings: increment(finalWinnings)
    };
    if (adWatched) {
        updatePayload.spinAdWatchCount = increment(1);
        updatePayload.adWatchHistory = arrayUnion({
            id: doc(collection(firestore, 'temp')).id,
            element: 'Spin Wheel Multiplier',
            timestamp: Date.now()
        });
    }
    if ((userProfile?.spinCount || 0) >= 1) {
        updatePayload.spinCooldownEnd = Date.now() + 8 * 3600000;
    }
    await updateDoc(userDocRef, updatePayload);
  }, [user, firestore, userProfile?.spinCount]);

  const activeReferralsCount = useMemo(() => {
    return allReferrals.filter(r => r.status === 'Active').length;
  }, [allReferrals]);

  const activeReferrals = useMemo(() => allReferrals.filter(r => r.status === 'Active'), [allReferrals]);
  const inactiveReferrals = useMemo(() => allReferrals.filter(r => r.status === 'Inactive'), [allReferrals]);

  useEffect(() => {
    if (!userProfile) {
        setLiveCoins(0); setTotalMiningRate(0.25); setMiningRateBreakdown(null);
        return;
    }
    const interval = setInterval(() => {
        const now = Date.now();
        const baseRate = userProfile.baseMiningRate || 0.25;
        const appliedCodeBonus = userProfile.appliedCodeBoost || 0;
        let currentBoostRate = 0;
        (userProfile.activeBoosts || []).forEach(boost => { if (now < boost.endTime) currentBoostRate += boost.rate; });
        const referralBonusRate = activeReferralsCount * 0.25;
        const currentTotalMiningRate = baseRate + referralBonusRate + currentBoostRate + appliedCodeBonus;
        setMiningRateBreakdown({ base: baseRate, boost: currentBoostRate, referral: referralBonusRate, appliedCode: appliedCodeBonus });
        setTotalMiningRate(currentTotalMiningRate);

        if (userProfile.sessionEndTime && now < userProfile.sessionEndTime && userProfile.miningStartTime) {
            const elapsedTimeHours = (now - userProfile.miningStartTime) / 3600000;
            let totalLiveEarnings = (baseRate + appliedCodeBonus) * elapsedTimeHours;
            (userProfile.activeBoosts || []).forEach(boost => {
              if (now > boost.startTime) {
                const effectiveEndTime = Math.min(now, boost.endTime);
                const elapsedBoostTimeHours = (effectiveEndTime - boost.startTime) / 3600000;
                totalLiveEarnings += boost.rate * elapsedBoostTimeHours;
              }
            });
            totalLiveEarnings += (userProfile.spinWinnings || 0) + (userProfile.sessionMissedCoinEarnings || 0) + (userProfile.sessionBaseEarnings || 0);
            setLiveCoins(totalLiveEarnings);
        } else {
            setLiveCoins(userProfile.unclaimedCoins || 0);
        }
    }, 100);
    return () => clearInterval(interval);
  }, [userProfile, activeReferralsCount]);

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const privateContactDocRef = doc(firestore, `users/${user.uid}/private/contact`);
    const unsubscribeProfile = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const profileData = snap.data() as Omit<UserProfile, 'id' | 'email' | 'mobileNumber'>;
        const privateContactSnap = await getDoc(privateContactDocRef);
        const privateData = privateContactSnap.exists() ? privateContactSnap.data() : { email: '', mobileNumber: '' };
        const profile: UserProfile = { 
          id: snap.id, ...profileData,
          email: privateData.email, mobileNumber: privateData.mobileNumber,
        };
        setUserProfile(profile);
        setProfileLoading(false);
      }
    });
    return () => unsubscribeProfile();
  }, [user, firestore]);

  const value: AuthContextType = {
    userProfile, loading, isSigningIn, isFinalizing, emailVerified, logout,
    sendVerificationEmail: useCallback(async () => {}, []),
    initializeRecaptcha, signInWithPhoneNumber, signInWithGoogle, confirmOtp,
    verifyPhoneNumber: useCallback(async () => ({} as any), []),
    confirmPhoneNumberVerification: useCallback(async () => {}, []),
    updateUserProfile, updateUserEmail: useCallback(async () => {}, []),
    updateUserPhoneNumber: useCallback(async () => {}, []),
    updateMiningState, claimMinedCoins,
    adminStartUserSession: useCallback(async () => {}, []),
    adminTerminateUserSession: useCallback(async () => {}, []),
    creditSpinWinnings, applySpinWinnings, updateMiningRate, applyReferralCode,
    adminApplyReferralCode: useCallback(async () => {}, []),
    transferCoins, respondToTransferByAdmin, sendNotificationToUser: useCallback(async () => {}, []),
    deleteAccount: useCallback(async () => {}, []),
    adminDeleteChatMessage: useCallback(async () => {}, []),
    adminClearOpenChats: useCallback(async () => {}, []),
    requestWithdrawal: useCallback(async () => {}, []),
    adminUpdateUserCoins: useCallback(async () => {}, []),
    adminRemoveReferral: useCallback(async () => {}, []),
    setGlobalBaseMiningRate: useCallback(async () => {}, []),
    getGlobalSessionDuration: useCallback(async () => 480, []),
    setGlobalSessionDuration: useCallback(async () => {}, []),
    grantBonusSpins: useCallback(async () => {}, []),
    clearUserNotifications: useCallback(async () => {}, []),
    sendUniversalMessage: useCallback(async () => {}, []),
    createSupportChatFromFeedback: useCallback(async () => {}, []),
    setWithdrawalRate: useCallback(async () => {}, []),
    respondToRateProposal: useCallback(async () => {}, []),
    collectDailyAdCoin, claimMissedAdCoin, totalMiningRate, miningRateBreakdown,
    liveCoins, allReferrals, activeReferrals, inactiveReferrals, referralsLoading,
    activeReferralsCount, showOnboarding, setShowOnboarding, theme, setTheme,
    adCooldownEndTime, startAdCooldown, requestFollow: useCallback(async () => {}, []),
    approveFollowRequest: useCallback(async () => {}, []),
    disapproveFollowRequest: useCallback(async () => {}, []),
    adminSetFollowStatus: useCallback(async () => {}, []),
    setUserHasRatedOnPlayStore: useCallback(async () => {}, []),
    canWatchAd, toast, updateAirdropConfig: useCallback(async () => {}, []),
    respondToKuberRequest: useCallback(async () => {}, []),
    clearKuberSessionLogs: useCallback(async () => {}, []),
    dailyAdCoins, t, setLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

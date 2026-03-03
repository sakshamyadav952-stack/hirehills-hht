
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  useUser,
  useAuth as useFirebaseAuth,
  useFirestore,
  useFirebaseApp,
} from '@/firebase';
import {
  signOut,
  deleteUser,
  User,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  ConfirmationResult,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, onSnapshot, updateDoc, runTransaction, arrayUnion, query, collection, where, documentId, getDocs, writeBatch, deleteDoc, setDoc, getDoc, increment, addDoc, orderBy, Timestamp, arrayRemove, Firestore } from 'firebase/firestore';
import type { UserProfile, WithdrawalRequest, ActiveBoost, DailyAdCoin, SessionConfig, AdWatchEvent, AirdropConfig, ChatMessage, KuberBlock, KuberRequest, KuberId } from '@/lib/types';
import { useToast, toast as toastFn } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { differenceInHours } from 'date-fns';
import { parsePhoneNumber } from 'libphonenumber-js';
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
  totalUserSupportCount: number;
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
  referralEarnings: number;
  respondToKuberRequest: (request: KuberRequest) => Promise<void>;
  clearKuberSessionLogs: () => Promise<void>;
  creditCrushOracleInstall: () => Promise<void>;
  dailyAdCoins: DailyAdCoin[];
  t: (key: string) => string;
  setLanguage: (lang: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);


// Helper function to generate a random alphanumeric code
const generateAlphanumericCode = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Function to generate a unique profile code, ensuring it's not already in use
const generateUniqueProfileCode = async (db: Firestore): Promise<string> => {
    let profileCode: string;
    let isUnique = false;
    const usersRef = collection(db, 'users');

    while (!isUnique) {
        profileCode = generateAlphanumericCode(6);
        const q = query(usersRef, where('profileCode', '==', profileCode));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            isUnique = true;
        }
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
  const [totalUserSupportCount, setTotalUserSupportCount] = useState(0);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [adCooldownEndTime, setAdCooldownEndTime] = useState<number | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [canWatchAd, setCanWatchAd] = useState(true);
  const [referrerProfile, setReferrerProfile] = useState<UserProfile | null>(null);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [dailyAdCoins, setDailyAdCoins] = useState<DailyAdCoin[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const startAdCooldown = useCallback(() => {
    setAdCooldownEndTime(Date.now() + 15000); // 15 seconds UI cooldown
  }, []);

  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('User not authenticated.');
    const userDocRef = doc(firestore, 'users', user.uid);
    
    try {
        await updateDoc(userDocRef, data);
    } catch(e: any) {
        toast({ title: 'Update Failed', description: 'Could not update your profile.', variant: 'destructive' });
        errorEmitter.emit(
            'permission-error',
            new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: data,
            })
        );
        throw e;
    }
  }, [user, firestore, toast]);

  const setLanguage = useCallback((lang: string) => {
    if (userProfile?.language !== lang) {
      localStorage.removeItem(`translations_${userProfile?.language}`);
      updateUserProfile({ language: lang });
    }
  }, [userProfile?.language, updateUserProfile]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (user) {
      const userDocRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userDocRef, { theme: newTheme });
    }
  };

  const masterTranslationList = useMemo(() => [
    'HOT Tokens Earned This Session',
    'Coins Ready to Claim',
    'Start Mining',
    'Total Balance:',
    'Start',
    'Claim Coins',
  ], []);

  const fetchAllTranslations = useCallback(async (lang: string) => {
      if (!userProfile) return;

      const cached = localStorage.getItem(`translations_${lang}`);
      if (cached) {
          setTranslations(JSON.parse(cached));
          return;
      }

      try {
          const result = await translateText({
              texts: masterTranslationList,
              targetLanguage: lang,
              isAdmin: !!userProfile.isAdmin
          });

          if (result.translations) {
              setTranslations(result.translations);
              localStorage.setItem(`translations_${lang}`, JSON.stringify(result.translations));
          } else if (!userProfile.isAdmin) {
              toast({
                  title: "Translation Not Available",
                  description: "Admin will add translations for this language soon.",
                  variant: "destructive"
              });
          }
      } catch (error) {
          console.error("Translation fetch failed:", error);
      }
  }, [userProfile, masterTranslationList, toast]);

  useEffect(() => {
    if (!userProfile) return;
    const targetLanguage = userProfile.language || 'en';
    fetchAllTranslations(targetLanguage);
  }, [userProfile?.language, fetchAllTranslations, userProfile]);

  const t = useCallback((key: string) => {
      return translations[key] || key;
  }, [translations]);


  useEffect(() => {
    if (userProfile?.theme) {
      setThemeState(userProfile.theme);
    } else {
      setThemeState('dark');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) {
        setCanWatchAd(true);
        return;
    }
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentAds = (userProfile.adWatchHistory || []).filter(ad => ad.timestamp > twentyFourHoursAgo);
    setCanWatchAd(!!userProfile.adsUnlocked && recentAds.length < 10); // Limit to 10 ads/day for HOT
}, [userProfile]);

  const emailVerified = user?.emailVerified || false;

  const { activeReferrals, inactiveReferrals, activeReferralsCount } = useMemo(() => {
    const active: ReferralWithEarnings[] = [];
    const inactive: ReferralWithEarnings[] = [];
    if (allReferrals) {
      allReferrals.forEach(r => {
        if (r.status === 'Active') {
          active.push(r);
        } else {
          inactive.push(r);
        }
      });
    }
    return { activeReferrals: active, inactiveReferrals: inactive, activeReferralsCount: active.length };
  }, [allReferrals]);

  const createNewUserProfile = useCallback(async (user: User, mobileNumber?: string): Promise<UserProfile> => {
    const userDocRef = doc(firestore, 'users', user.uid);
    const privateContactDocRef = doc(firestore, `users/${user.uid}/private/contact`);
    
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        const existingData = docSnap.data();
        const privateSnap = await getDoc(privateContactDocRef);
        const privateData = privateSnap.exists() ? privateSnap.data() : {};
        return { id: docSnap.id, ...existingData, ...privateData } as UserProfile;
    }

    const batch = writeBatch(firestore);
    
    const profileCode = await generateUniqueProfileCode(firestore);
    const randomName = `User${profileCode}`;
    const generateCardNumber = () => Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000).toString()).join('');

    let country = 'Unknown';
    try {
        const response = await fetch('https://ipapi.co/country_name');
        if (response.ok) {
            country = await response.text();
        }
    } catch (error) {
        console.error("Could not fetch country:", error);
    }

    const newUserProfileData: Omit<UserProfile, 'id' | 'createdAt' | 'email' | 'mobileNumber'> = {
        fullName: user.displayName || randomName,
        gender: 'other', 
        phoneVerified: !!(user.phoneNumber),
        profileCode,
        country: country,
        cardNumber: generateCardNumber(),
        minedCoins: 0,
        unclaimedCoins: 0,
        miningStartTime: null,
        sessionEndTime: null,
        sessionBaseEarnings: 0,
        sessionReferralEarnings: 0,
        sessionMissedCoinEarnings: 0,
        lastTransactionTimestamp: null,
        spinCount: 0,
        spinWinnings: 0,
        spinCooldownEnd: null,
        spinAdWatchCount: 0,
        activeBoosts: [],
        adWatchHistory: [],
        miningRate2H: 0,
        cooldownEnd2H: null,
        miningRate4H: 0,
        cooldownEnd4H: null,
        miningRate8H: 0,
        cooldownEnd8H: null,
        baseMiningRate: 0.25,
        appliedCodeBoost: 0,
        referredBy: null,
        referredByName: null,
        referrals: [],
        profileImageUrl: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${randomName}`,
        withdrawalRequests: [],
        notifications: [],
        hasRatedOnPlayStore: false,
        airdropReferralsCount: 0,
        airdropBonusClaimed: false,
        airdropCompletionBonusClaimed: false,
        deviceNames: [navigator.userAgent],
        ipAddresses: [],
        notes: [],
        chat: null,
        unreadSupportRepliesCount: 0,
        adsUnlocked: false,
        hasUnreadAdminMessage: false,
        hasUnreadUserMessage: false,
        chatStatus: null,
        kuberBlocks: [],
        kuberRequests: [],
        kuberApprovalRequests: [],
        kuberIds: [],
        dailyClaimedCoins: [],
    };
    
    batch.set(userDocRef, { ...newUserProfileData, createdAt: serverTimestamp() });
    
    const privateData = {
        email: user.email || `user${profileCode}@hirehills.in`,
        mobileNumber: mobileNumber || user.phoneNumber || ''
    };
    batch.set(privateContactDocRef, privateData);

    await batch.commit();
    
    const createdProfile: UserProfile = {
        ...newUserProfileData,
        ...privateData,
        id: user.uid,
        createdAt: new Timestamp(Math.floor(Date.now() / 1000), 0)
    };

    return createdProfile;
  }, [firestore]);


  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setAllReferrals([]);
      setProfileLoading(false);
      setReferralsLoading(false);
      setShowOnboarding(false);
      setTotalUserSupportCount(0);
      setDailyAdCoins([]);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const privateContactDocRef = doc(firestore, `users/${user.uid}/private/contact`);

    const unsubscribeProfile = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const profileData = { id: snap.id, ...snap.data() } as Omit<UserProfile, 'email' | 'mobileNumber'>;
        const privateContactSnap = await getDoc(privateContactDocRef);
        const privateData = privateContactSnap.exists() ? privateContactSnap.data() : { email: '', mobileNumber: '' };

        const profile: UserProfile = { 
          ...profileData,
          email: privateData.email,
          mobileNumber: privateData.mobileNumber,
        };
        setUserProfile(profile);

        if (!profile.fullName || profile.fullName === '' || profile.fullName.startsWith('User')) {
            setShowOnboarding(true);
        } else {
            setShowOnboarding(false);
        }
        
        const deviceName = navigator.userAgent;
        const updates: { [key: string]: any } = {};
        
        if (!profile.deviceNames?.includes(deviceName)) {
            updates.deviceNames = arrayUnion(deviceName);
        }

        try {
            const ipResponse = await fetch('https://ipapi.co/ip');
            if (ipResponse.ok) {
                const ipAddress = await ipResponse.text();
                if (!profile.ipAddresses?.includes(ipAddress)) {
                    const currentIps = profile.ipAddresses || [];
                    if (currentIps.length >= 20) {
                        const oldestIp = currentIps[0];
                        await updateDoc(userDocRef, { ipAddresses: arrayRemove(oldestIp) });
                    }
                    updates.ipAddresses = arrayUnion(ipAddress);
                }
            }
        } catch (error) {
            console.error("Could not fetch IP address:", error);
        }

        if (Object.keys(updates).length > 0) {
            updateDocumentNonBlocking(userDocRef, updates);
        }

      }
      setProfileLoading(false);
    }, (err) => {
      const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: userDocRef.path,
      });
      errorEmitter.emit('permission-error', contextualError);
      setUserProfile(null);
      setProfileLoading(false);
    });

    return () => {
      unsubscribeProfile();
    };
  }, [user, firestore]);

  useEffect(() => {
    const pagesThatNeedReferrals = ['/', '/referrals', '/profile', '/admin/find-user', '/admin/apply-code-user', '/live-report', '/kuber'];
    if (!pagesThatNeedReferrals.some(p => pathname.startsWith(p))) {
        setAllReferrals([]);
        setReferralsLoading(false);
        return;
    }

    if (!userProfile?.id || !userProfile.referrals) {
        setAllReferrals([]);
        setReferralsLoading(false);
        return;
    }

    const referralUids = userProfile.referrals || [];
    if (referralUids.length === 0) {
        setAllReferrals([]);
        setReferralsLoading(false);
        return;
    }
    
    setReferralsLoading(true);
    const usersRef = collection(firestore, 'users');
    
    const chunks: string[][] = [];
    for (let i = 0; i < referralUids.length; i += 30) {
      chunks.push(referralUids.slice(i, i + 30));
    }

    const unsubscribeFunctions = chunks.map(chunk => {
        if (chunk.length === 0) return () => {};
        const q = query(usersRef, where(documentId(), 'in', chunk));
        return onSnapshot(q, (snapshot) => {
            const fetchedReferrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            
            setAllReferrals(prevReferrals => {
                const referralMap = new Map(prevReferrals.map(p => [p.id, p]));
                fetchedReferrals.forEach(ref => {
                  const referralWithStatus = {
                      ...ref,
                      status: ref.sessionEndTime && ref.sessionEndTime > Date.now() ? 'Active' : 'Inactive' as 'Active' | 'Inactive',
                  };
                  referralMap.set(ref.id, referralWithStatus);
              });
                return Array.from(referralMap.values());
            });
            setReferralsLoading(false);
        }, (error) => {
            console.error("Error fetching referrals chunk: ", error);
            setReferralsLoading(false);
        });
    });

    return () => {
        unsubscribeFunctions.forEach(unsub => unsub());
    };

  }, [userProfile?.id, JSON.stringify(userProfile?.referrals), firestore, pathname]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    const calculateLiveValues = () => {
        if (!userProfile) {
            setLiveCoins(0);
            setTotalMiningRate(0.25);
            setMiningRateBreakdown(null);
            setReferralEarnings(0);
            return;
        }

        const now = Date.now();
        const baseRate = userProfile.baseMiningRate || 0.25;
        const appliedCodeBonus = userProfile.appliedCodeBoost || 0;

        let currentBoostRate = 0;
        (userProfile.activeBoosts || []).forEach(boost => {
            if (now < boost.endTime) {
                currentBoostRate += boost.rate;
            }
        });
        
        const referralBonusRate = activeReferralsCount * 0.25;
        const currentTotalMiningRate = baseRate + referralBonusRate + currentBoostRate + appliedCodeBonus;

        setMiningRateBreakdown({ base: baseRate, boost: currentBoostRate, referral: referralBonusRate, appliedCode: appliedCodeBonus });
        setTotalMiningRate(currentTotalMiningRate);

        if (userProfile.sessionEndTime && now < userProfile.sessionEndTime && userProfile.miningStartTime) {
            const sessionStartTime = userProfile.miningStartTime;
            const elapsedTimeSinceSessionStartMs = now - sessionStartTime;
            const elapsedTimeHours = elapsedTimeSinceSessionStartMs / (1000 * 60 * 60);

            let totalLiveEarnings = (baseRate + appliedCodeBonus) * elapsedTimeHours;

            (userProfile.activeBoosts || []).forEach(boost => {
              if (now > boost.startTime) {
                const effectiveEndTime = Math.min(now, boost.endTime);
                const elapsedBoostTimeMs = effectiveEndTime - boost.startTime;
                if (elapsedBoostTimeMs > 0) {
                  const elapsedBoostTimeHours = elapsedBoostTimeMs / (1000 * 60 * 60);
                  totalLiveEarnings += boost.rate * elapsedBoostTimeHours;
                }
              }
            });

            totalLiveEarnings += userProfile.spinWinnings || 0;
            totalLiveEarnings += userProfile.sessionMissedCoinEarnings || 0;
            totalLiveEarnings += userProfile.sessionBaseEarnings || 0;
            setLiveCoins(totalLiveEarnings);
        } else {
            setLiveCoins(userProfile.unclaimedCoins || 0);
        }
    };

    calculateLiveValues();
    interval = setInterval(calculateLiveValues, 100);

    return () => {
        if (interval) clearInterval(interval);
    };
}, [userProfile, referrerProfile, activeReferralsCount]);

  const loading = isAuthLoading || isProfileLoading;

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    if (loginTimeoutRef.current) clearTimeout(loginTimeoutRef.current);

    if (typeof window !== 'undefined' && (window as any).AndroidApp?.startGoogleLogin) {
        (window as any).AndroidApp.startGoogleLogin();
        loginTimeoutRef.current = setTimeout(() => {
            setIsSigningIn(false);
            loginTimeoutRef.current = null;
            toast({ title: 'Sign-in Timeout', variant: 'destructive' });
        }, 20000);
    } else {
        router.push('/app-only');
        setIsSigningIn(false);
    }
  }, [router, toast]);

  const updateMiningState = useCallback(async (startTime: number | null, endTime: number | null = null) => {
    if (!user || !userProfile) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const dataToUpdate: { [key: string]: any } = { 
      miningStartTime: startTime,
      sessionEndTime: endTime,
    };
    if (startTime !== null) {
      dataToUpdate.spinCount = 0;
      dataToUpdate.spinCooldownEnd = null;
      dataToUpdate.adWatchHistory = [];
      dataToUpdate.sessionBaseEarnings = 0;
      dataToUpdate.sessionReferralEarnings = 0;
      dataToUpdate.sessionMissedCoinEarnings = 0;
    }
    await updateDoc(userDocRef, dataToUpdate);
  }, [user, userProfile, firestore]);
  
  const claimMinedCoins = useCallback(async (): Promise<number | undefined> => {
    if (!user || !userProfile) return;
    const claimedAmount = userProfile.unclaimedCoins || 0;
    if (claimedAmount <= 0) return 0;

    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimMinedCoins');
        const result = await claimFunction();
        const data = result.data as { success: boolean; claimedAmount: number };
        return data.claimedAmount;
    } catch (error) {
        console.error("Failed to claim coins:", error);
        toast({ title: 'Claim Failed', variant: 'destructive' });
        return undefined;
    }
  }, [user, userProfile, toast]);

    useEffect(() => {
        if (!user || !userProfile) return;

        const generateAndFilterDailyCoins = () => {
            const now = new Date();
            const schedule = ['22:00', '16:00', '12:00', '08:00'];
            const last8Slots: { id: string, availableAt: Date }[] = [];
            let tempDate = new Date(now);

            while (last8Slots.length < 8) {
                for (const timeSlot of schedule) {
                    if (last8Slots.length >= 8) break;
                    const [hour, minute] = timeSlot.split(':').map(Number);
                    const slotTime = new Date(tempDate);
                    slotTime.setHours(hour, minute, 0, 0);
                    if (slotTime <= now) {
                        const id = `${slotTime.getFullYear()}-${String(slotTime.getMonth()+1).padStart(2,'0')}-${String(slotTime.getDate()).padStart(2,'0')}-${timeSlot}`;
                        last8Slots.push({ id, availableAt: slotTime });
                    }
                }
                tempDate.setDate(tempDate.getDate() - 1);
            }

            const validSlotIds = new Set(last8Slots.map(s => s.id));
            const userClaimedIds = userProfile.dailyClaimedCoins || [];
            const prunedClaimedIds = userClaimedIds.filter(id => validSlotIds.has(id)).slice(-8);

            if (JSON.stringify(prunedClaimedIds) !== JSON.stringify(userClaimedIds)) {
                updateDocumentNonBlocking(doc(firestore, 'users', user.uid), { dailyClaimedCoins: prunedClaimedIds });
            }

            const newGeneratedCoins: DailyAdCoin[] = [];
            const claimedIdSet = new Set(prunedClaimedIds);

            for (const slot of last8Slots) {
                if (!claimedIdSet.has(slot.id)) {
                    const availableAtTime = slot.availableAt.getTime();
                    const expiresAt = availableAtTime + 30 * 60 * 1000;
                    const finalExpiryAt = availableAtTime + 48 * 60 * 60 * 1000;
                    if (now.getTime() > finalExpiryAt) continue;
                    const status: 'available' | 'missed' = (now.getTime() >= availableAtTime && now.getTime() < expiresAt) ? 'available' : 'missed';
                    newGeneratedCoins.push({ id: slot.id, status, availableAt: availableAtTime, expiresAt, finalExpiryAt });
                }
            }
            setDailyAdCoins(newGeneratedCoins);
        };

        generateAndFilterDailyCoins();
        const interval = setInterval(generateAndFilterDailyCoins, 60000);
        return () => clearInterval(interval);
    }, [user, userProfile, firestore]);

const collectDailyAdCoin = useCallback(async (coinId: string): Promise<number | undefined> => {
    if (!user) return;
    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimDailyCoin');
        const result = await claimFunction({ coinId, isMissed: false });
        const data = result.data as { success: boolean, claimedAmount: number };
        if (data.success) return data.claimedAmount;
    } catch(error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
}, [user, toast]);

const claimMissedAdCoin = useCallback(async (coinId: string, adElement: string): Promise<number | undefined> => {
    if (!user || !userProfile) return;
    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimDailyCoin');
        const result = await claimFunction({ coinId, isMissed: true, adElement });
        const data = result.data as { success: boolean, claimedAmount: number };
        if (data.success) {
            startAdCooldown();
            return data.claimedAmount;
        }
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
}, [user, userProfile, toast, startAdCooldown]);

  const value: AuthContextType = {
    userProfile, loading, isSigningIn, isFinalizing, emailVerified, logout,
    sendVerificationEmail, initializeRecaptcha, signInWithPhoneNumber, signInWithGoogle,
    confirmOtp, verifyPhoneNumber, confirmPhoneNumberVerification, updateUserProfile,
    updateUserEmail, updateUserPhoneNumber, updateMiningState, claimMinedCoins,
    adminStartUserSession, adminTerminateUserSession, creditSpinWinnings, applySpinWinnings,
    updateMiningRate, applyReferralCode, adminApplyReferralCode, sendNotificationToUser,
    deleteAccount, adminDeleteChatMessage, adminClearOpenChats, requestWithdrawal,
    adminUpdateUserCoins, adminRemoveReferral, setGlobalBaseMiningRate, setGlobalSessionDuration,
    getGlobalSessionDuration, grantBonusSpins, clearUserNotifications, sendUniversalMessage,
    createSupportChatFromFeedback, setWithdrawalRate, respondToRateProposal,
    collectDailyAdCoin, claimMissedAdCoin, totalMiningRate, miningRateBreakdown,
    liveCoins, allReferrals, activeReferrals, inactiveReferrals, referralsLoading,
    activeReferralsCount, totalUserSupportCount, showOnboarding, setShowOnboarding,
    theme, setTheme, adCooldownEndTime, startAdCooldown, requestFollow, approveFollowRequest,
    disapproveFollowRequest, adminSetFollowStatus, setUserHasRatedOnPlayStore, canWatchAd,
    toast, updateAirdropConfig, referralEarnings, respondToKuberRequest, clearKuberSessionLogs,
    creditCrushOracleInstall, dailyAdCoins, t, setLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};


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
  getAdditionalUserInfo,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  ConfirmationResult,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, onSnapshot, updateDoc, runTransaction, arrayUnion, query, collection, where, documentId, getDocs, writeBatch, deleteDoc, setDoc, getDoc, increment, addDoc, orderBy, Timestamp, arrayRemove, Firestore } from 'firebase/firestore';
import type { UserProfile, Transaction, PendingTransfer, WithdrawalRequest, Note, Comment, ActiveBoost, DailyAdCoin, SessionConfig, AdWatchEvent, AirdropConfig, ChatMessage, KuberBlock, KuberRequest, KuberId } from '@/lib/types';
import { useToast, toast as toastFn } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
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
  totalUserSupportCount: number;
  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  respondToRateProposal: (requestId: string, accepted: boolean) => Promise<void>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  pendingTransfers: PendingTransfer[];
  respondToTransfer: (transferId: string, approve: boolean) => Promise<void>;
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
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
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
    setAdCooldownEndTime(Date.now() + 15000); // 15 seconds
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
      // Clear cache when language changes
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
    'Blistree Tokens Earned This Session',
    'Coins Ready to Claim',
    'Start Mining',
    'Total Balance:',
    'Start',
    'Claim Coins',
    // Add any other static text from your components here
  ], []);

  const fetchAllTranslations = useCallback(async (lang: string) => {
      if (!userProfile) return;

      const cached = localStorage.getItem(`translations_${lang}`);
      if (cached) {
          setTranslations(JSON.parse(cached));
          return; // Already have cached translations for this language
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

  // Handle language change
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
      setThemeState('dark'); // Default to dark theme
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) {
        setCanWatchAd(true); // Default to true if no profile
        return;
    }
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentAds = (userProfile.adWatchHistory || []).filter(ad => ad.timestamp > twentyFourHoursAgo);
    
    // Ads are available if the user has unlocked them AND has watched fewer than 5 ads in the last 24 hours.
    setCanWatchAd(!!userProfile.adsUnlocked && recentAds.length < 5);
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
        console.log("User profile already exists, skipping creation.");
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
        email: user.email || `user${profileCode}@blistree.in`,
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
      setPendingTransfers([]);
      setDailyAdCoins([]);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const privateContactDocRef = doc(firestore, `users/${user.uid}/private/contact`);

    const unsubscribeProfile = onSnapshot(userDocRef, async (snap) => {
      if (snap.exists()) {
        const profileData = { id: snap.id, ...snap.data() } as Omit<UserProfile, 'email' | 'mobileNumber'>;
        
        // Fetch private data
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

      } else {
        // This case is primarily for new users. After creation, this listener will pick up the new doc.
        // We add a failsafe in signInWith... methods to handle immediate profile setting.
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

    // This calculates the total unread count for the admin.
    if (userProfile?.isAdmin) {
        const allUsersQuery = query(collection(firestore, 'users'));
        const unsubscribeAllNotes = onSnapshot(allUsersQuery, (usersSnapshot) => {
            let totalAdminUnread = 0;
            const promises = usersSnapshot.docs.map(userDoc => {
                const notesQuery = query(collection(firestore, `users/${userDoc.id}/notes`));
                return getDocs(notesQuery).then(notesSnapshot => {
                    let userUnread = 0;
                    notesSnapshot.forEach(noteDoc => {
                         const note = noteDoc.data() as Note;
                         if ((note.status || 'pending') === 'pending' && !note.isReadByAdmin) {
                            userUnread++;
                         } else {
                            if (note.comments?.some(c => c.authorId !== user.uid && !c.isRead)) {
                                userUnread++;
                            }
                         }
                    });
                    return userUnread;
                });
            });
            Promise.all(promises).then(counts => {
                totalAdminUnread = counts.reduce((acc, count) => acc + count, 0);
                setTotalUserSupportCount(totalAdminUnread);
            });
        });
        
    }

    const transfersQuery = query(collection(firestore, 'pendingTransfers'), where('receiverId', '==', user.uid));
    const unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => {
      const transfers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingTransfer));
      setPendingTransfers(transfers);
    }, (err) => {
      console.error("Error fetching pending transfers:", err);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeTransfers();
    };
  }, [user, firestore, userProfile?.isAdmin]);

  useEffect(() => {
    // Only fetch referrals on specific pages to improve initial load time
    const pagesThatNeedReferrals = ['/', '/referrals', '/profile', '/admin/find-user', '/admin/apply-code-user', '/live-report', '/kuber'];
    if (!pagesThatNeedReferrals.some(p => pathname.startsWith(p))) {
        setAllReferrals([]); // Clear referrals when not on a relevant page
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
  
  // New useEffect to fetch the referrer's profile if one exists
  useEffect(() => {
    if (userProfile?.referredBy) {
      const referrerDocRef = doc(firestore, 'users', userProfile.referredBy);
      const unsubscribe = onSnapshot(referrerDocRef, (doc) => {
        if (doc.exists()) {
          setReferrerProfile(doc.data() as UserProfile);
        } else {
          setReferrerProfile(null);
        }
      }, (error) => {
        console.error("Error fetching referrer profile:", error);
        setReferrerProfile(null);
      });
      return () => unsubscribe();
    } else {
      setReferrerProfile(null);
    }
  }, [userProfile?.referredBy, firestore]);
  
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
    interval = setInterval(calculateLiveValues, 1000);

    return () => {
        if (interval) clearInterval(interval);
    };
}, [userProfile, referrerProfile, activeReferralsCount]);

    useEffect(() => {
    if (!user || !userProfile) return;
  
    const isSessionActive = userProfile.sessionEndTime && Date.now() < userProfile.sessionEndTime;
    if (!isSessionActive || allReferrals.length === 0) return;

    const autoApproveKuberRequests = async () => {
      let kuberBlocksUpdated = false;
      const newKuberBlocks: KuberBlock[] = [...(userProfile.kuberBlocks || [])];
      const newKuberIds: KuberId[] = [...(userProfile.kuberIds || [])];
  
      for (const referral of allReferrals) {
        if (referral.kuberRequests && referral.kuberRequests.length > 0) {
          for (const request of referral.kuberRequests) {
            const existingIdEntry = newKuberIds.find(kId => kId.referralId === referral.id);
            const isAlreadyProcessed = existingIdEntry && existingIdEntry.lastRequestId === request.id;

            if (!isAlreadyProcessed) {
              const newBlock: KuberBlock = {
                id: request.id,
                referralId: referral.id,
                referralName: referral.fullName,
                userSessionStartTime: request.userSessionStartTime,
                referralSessionEndTime: userProfile.sessionEndTime!,
              };
              newKuberBlocks.push(newBlock);

              if (existingIdEntry) {
                existingIdEntry.lastRequestId = request.id;
              } else {
                newKuberIds.push({ referralId: referral.id, referralName: referral.fullName, lastRequestId: request.id });
              }
              
              kuberBlocksUpdated = true;
            }
          }
        }
      }
  
      if (kuberBlocksUpdated) {
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
          await updateDoc(userDocRef, {
            kuberBlocks: newKuberBlocks,
            kuberIds: newKuberIds,
          });
        } catch (error) {
          console.error("Error auto-approving Kuber requests:", error);
        }
      }
    };
  
    autoApproveKuberRequests();
  }, [user, userProfile, allReferrals, firestore]);
  
  const loading = isAuthLoading || isProfileLoading;

  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  const sendVerificationEmail = useCallback(async () => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to send a verification email.', variant: 'destructive' });
        return;
    }
    if (!user.email) {
        toast({ title: 'Error', description: 'No email address is associated with your account.', variant: 'destructive' });
        return;
    }

    try {
        const functions = getFunctions();
        const sendVerificationEmailFn = httpsCallable(functions, 'sendVerificationEmail');
        await sendVerificationEmailFn({ email: user.email });

        toast({ title: 'Verification Email Sent', description: `A verification link has been sent to ${user.email}.` });
    } catch (error) {
        console.error("Error sending verification email:", error);
        toast({ title: 'Error', description: 'Failed to send verification email. Please try again.', variant: 'destructive' });
    }
}, [user, toast]);
  
  const verifyPhoneNumber = useCallback(async (phoneNumber: string, container: HTMLElement): Promise<ConfirmationResult> => {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    if (!user) throw new Error("User not signed in.");

    recaptchaVerifierRef.current?.clear();

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
        'size': 'invisible',
    });
    
    await recaptchaVerifierRef.current.render();
    
    return await linkWithPhoneNumber(user, phoneNumber, recaptchaVerifierRef.current);
  }, [auth, user]);

  const confirmPhoneNumberVerification = useCallback(async (confirmationResult: ConfirmationResult, verificationCode: string): Promise<void> => {
    if (!user) throw new Error("User not signed in.");
    
    await confirmationResult.confirm(verificationCode);

    const userDocRef = doc(firestore, 'users', user.uid);
    await updateDoc(userDocRef, {
        phoneVerified: true,
    });
    
    toast({ title: 'Success', description: 'Your phone number has been verified.' });
  }, [user, firestore, toast]);

    const initializeRecaptcha = useCallback((container: HTMLElement) => {
        if (!auth) return;
        recaptchaVerifierRef.current?.clear();

        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, container, {
            'size': 'invisible',
        });
        
        recaptchaVerifierRef.current.render();
    }, [auth]);

  const signInWithPhoneNumber = useCallback(async (phoneNumber: string): Promise<ConfirmationResult> => {
    if (!auth) throw new Error("Firebase Auth not initialized.");
    if (!recaptchaVerifierRef.current) throw new Error("reCAPTCHA verifier not initialized.");

    const verifier = recaptchaVerifierRef.current;
    return await firebaseSignInWithPhoneNumber(auth, phoneNumber, verifier);
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    
    if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
    }

    if (typeof window !== 'undefined' && (window as any).AndroidApp?.startGoogleLogin) {
        (window as any).AndroidApp.startGoogleLogin();

        loginTimeoutRef.current = setTimeout(() => {
            setIsSigningIn(false);
            loginTimeoutRef.current = null;
            toast({
                title: 'Sign-in took too long',
                description: 'Please try signing in again. If the problem persists, try restarting the app.',
                variant: 'destructive',
            });
        }, 20000); // 20 seconds timeout
    } else {
        console.log("Native Google login not available. Please use the mobile app.");
        router.push('/app-only');
        setIsSigningIn(false);
    }
  }, [router, toast]);

  const confirmOtp = useCallback(async (confirmationResult: ConfirmationResult, otp: string) => {
    setIsSigningIn(true);
    try {
        const userCredential = await confirmationResult.confirm(otp);
        const docSnap = await getDoc(doc(firestore, 'users', userCredential.user.uid));
        if (!docSnap.exists()) {
            const newProfile = await createNewUserProfile(userCredential.user, userCredential.user.phoneNumber || undefined);
            setUserProfile(newProfile);
        }
        router.push('/');
    } finally {
        setIsSigningIn(false);
    }
  }, [createNewUserProfile, router, firestore]);

  useEffect(() => {
    const handleLoginSuccess = async (idToken: string) => {
        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }
        try {
            setIsSigningIn(true);
            const credential = GoogleAuthProvider.credential(idToken);
            const result = await signInWithCredential(auth, credential);
            
            const docSnap = await getDoc(doc(firestore, 'users', result.user.uid));
            if (!docSnap.exists()) {
                await createNewUserProfile(result.user);
            }
            
            router.push('/'); 

        } catch (err: any) {
            console.error("Login failed:", err);
            toast({ title: 'Login failed', description: `Could not create profile in user database: ${err.message}`, variant: 'destructive' });
        } finally {
            setIsSigningIn(false);
        }
    };
    (window as any).onGoogleLoginSuccess = handleLoginSuccess;

    const handleLoginError = (error: string) => {
        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }
        console.error("Native Google Login Error:", error);
        toast({ title: 'Google Sign-In failed', variant: 'destructive' });
        setIsSigningIn(false);
    };
    (window as any).onGoogleLoginError = handleLoginError;

    return () => {
        delete (window as any).onGoogleLoginSuccess;
        delete (window as any).onGoogleLoginError;
    };
  }, [auth, createNewUserProfile, toast, router, firestore]);

  const updateUserEmail = useCallback(async (newEmail: string) => {
    if (!user) throw new Error('User not authenticated.');

    try {
        const userDocRef = doc(firestore, `users/${user.uid}/private/contact`);
        await setDoc(userDocRef, { email: newEmail }, { merge: true });

        const functions = getFunctions();
        const sendVerificationEmailFn = httpsCallable(functions, 'sendVerificationEmail');
        await sendVerificationEmailFn({ email: newEmail });

        toast({
            title: 'Verification Email Sent',
            description: `A verification link has been sent to ${newEmail}. Please check your inbox.`,
        });
    } catch (error: any) {
        console.error("Error updating email:", error);
        
        let errorMessage = 'Could not update your email.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use by another account.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'This is a sensitive action. Please log out and log back in to update your email.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The email address is not valid.';
        }

        toast({ title: 'Update Failed', description: errorMessage, variant: 'destructive' });
        throw error;
    }
  }, [user, firestore, toast]);

  const updateUserPhoneNumber = useCallback(async (newMobileNumber: string) => {
    if (!user) {
        toast({ title: 'Not Authenticated', description: 'Please log in to update your number.', variant: 'destructive' });
        throw new Error('User not authenticated.');
    }
    
    const parsedNumber = parsePhoneNumber(newMobileNumber);
    if (!parsedNumber || !parsedNumber.isValid()) {
      toast({ title: 'Invalid Number', description: 'The phone number provided is not valid.', variant: 'destructive' });
      throw new Error('Invalid phone number.');
    }

    try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('mobileNumber', '==', newMobileNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && querySnapshot.docs[0].id !== user.uid) {
            toast({ title: 'Number in Use', description: 'This mobile number is already linked to another account.', variant: 'destructive' });
            throw new Error('Mobile number already in use.');
        }
        
        const contactDocRef = doc(firestore, `users/${user.uid}/private/contact`);
        await setDoc(contactDocRef, { mobileNumber: newMobileNumber }, { merge: true });

        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, { phoneVerified: false });

        toast({ title: 'Number Updated', description: 'Your mobile number has been updated. Please verify it.' });
        
    } catch (error: any) {
        console.error("Error updating phone number:", error);
        if (error.message.includes('already in use') || error.message.includes('not valid')) {
            // Toast already shown
        } else {
             toast({ title: 'Update Failed', description: 'Could not update your mobile number.', variant: 'destructive' });
        }
        throw error;
    }
  }, [user, firestore, toast]);

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

      if (userProfile.referredBy) {
        dataToUpdate.baseMiningRate = 0.25;
        dataToUpdate.appliedCodeBoost = 0.25;
      } else {
        dataToUpdate.baseMiningRate = 0.25;
        dataToUpdate.appliedCodeBoost = 0;
      }

      // Create Kuber Request for the user's referrer
      if (userProfile.referredBy && referrerProfile?.sessionEndTime && referrerProfile.sessionEndTime > startTime) {
          const newRequestId = doc(collection(firestore, 'temp')).id;
          const newRequest: KuberRequest = {
              id: newRequestId,
              userName: userProfile.fullName,
              userSessionStartTime: startTime,
              referrerSessionEndTime: referrerProfile.sessionEndTime,
          };
          dataToUpdate.kuberRequests = [newRequest];
      } else {
          dataToUpdate.kuberRequests = [];
      }

      const newKuberBlocks: KuberBlock[] = [];
      if (allReferrals) {
        for (const referral of allReferrals) {
            if (referral.status === 'Active' && referral.sessionEndTime) {
                const eightHoursInMillis = 8 * 60 * 60 * 1000;
                let effectiveReferralEndTime = referral.sessionEndTime;

                if (referral.sessionEndTime - startTime > eightHoursInMillis) {
                  effectiveReferralEndTime = startTime + eightHoursInMillis;
                }

                const newBlock: KuberBlock = {
                    id: doc(collection(firestore, 'temp')).id,
                    referralId: referral.id,
                    referralName: referral.fullName,
                    userSessionStartTime: startTime,
                    referralSessionEndTime: effectiveReferralEndTime,
                };
                newKuberBlocks.push(newBlock);
            }
        }
      }
      if (newKuberBlocks.length > 0) {
        dataToUpdate.kuberBlocks = arrayUnion(...newKuberBlocks);
      }
    }
    
    await updateDoc(userDocRef, dataToUpdate);

  }, [user, userProfile, firestore, referrerProfile, allReferrals]);
  
  const claimMinedCoins = useCallback(async (): Promise<number | undefined> => {
    if (!user || !userProfile) {
      return;
    }

    if (!userProfile.unclaimedCoins || userProfile.unclaimedCoins <= 0) {
      return 0;
    }

    const claimedAmount = userProfile.unclaimedCoins;

    setUserProfile(prev => prev ? { 
        ...prev, 
        minedCoins: prev.minedCoins + claimedAmount, 
        unclaimedCoins: 0, 
        activeBoosts: [], 
        spinWinnings: 0, 
        spinAdWatchCount: 0, 
        adWatchHistory: [], 
        sessionBaseEarnings: 0, 
        sessionReferralEarnings: 0, 
        sessionMissedCoinEarnings: 0, 
        kuberBlocks: [] 
    } : null);

    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimMinedCoins');
        const result = await claimFunction();
        const data = result.data as { success: boolean; claimedAmount: number };
        
        if (!data.success) {
            throw new Error("Cloud function reported failure.");
        }
        
        return data.claimedAmount;

    } catch (error) {
        console.error("Failed to claim coins via cloud function:", error);
        setUserProfile(prev => prev ? { 
            ...prev, 
            minedCoins: prev.minedCoins - claimedAmount, 
            unclaimedCoins: claimedAmount,
            kuberBlocks: userProfile.kuberBlocks
        } : null);
        toast({ title: 'Claim Failed', description: 'Could not claim your coins. Please try again.', variant: 'destructive' });
        return undefined;
    }
  }, [user, userProfile, toast]);
  
  const getGlobalSessionDuration = useCallback(async (): Promise<number> => {
    try {
        const configDocRef = doc(firestore, 'config', 'session');
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
            const config = docSnap.data() as SessionConfig;
            return config.durationMinutes || 480; // Default to 480 mins (8 hours)
        }
        return 480; // Default if config doesn't exist
    } catch (error) {
        console.error("Error fetching session duration, using default:", error);
        return 480;
    }
  }, [firestore]);

  const clientSideFinalizeSession = useCallback(async (userId: string, isAdminTermination: boolean = false) => {
    const targetUserDocRef = doc(firestore, 'users', userId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(targetUserDocRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist.");
        }

        const profile = userDoc.data() as UserProfile;
        
        if (!profile.miningStartTime || !profile.sessionEndTime) {
            // No active session to finalize.
            return;
        }

        const now = Date.now();
        // For a normal user, the session must be over. Admin can terminate anytime.
        if (!isAdminTermination && now < profile.sessionEndTime) {
            // Session not over yet for a regular user, do nothing.
            return;
        }

        const sessionStartTime = profile.miningStartTime;
        // If admin terminates, end time is now. Otherwise, it's the scheduled end time.
        const effectiveEndTime = isAdminTermination ? now : profile.sessionEndTime;
        
        const elapsedTimeHours = (effectiveEndTime - sessionStartTime) / (1000 * 60 * 60);

        const baseRate = profile.baseMiningRate || 0.25;
        const appliedCodeBonus = profile.appliedCodeBoost || 0; 
        
        const finalBaseEarnings = (baseRate + appliedCodeBonus) * elapsedTimeHours;
        let totalEarnings = finalBaseEarnings;

        (profile.activeBoosts || []).forEach((boost) => {
          const boostStart = boost.startTime;
          // Ensure the boost's end time doesn't exceed the session's effective end time
          const boostEnd = Math.min(boost.endTime, effectiveEndTime);
          if (boostEnd > boostStart) {
            const elapsedBoostTimeHours = (boostEnd - boostStart) / (1000 * 60 * 60);
            totalEarnings += boost.rate * elapsedBoostTimeHours;
          }
        });
        
        totalEarnings += profile.spinWinnings || 0;
        totalEarnings += profile.sessionMissedCoinEarnings || 0;

        let gBoxPoints = 0;
        if (profile.kuberBlocks) {
          profile.kuberBlocks.forEach((block) => {
            const blockEnd = Math.min(block.referralSessionEndTime, effectiveEndTime);
            const durationMs = Math.max(0, blockEnd - block.userSessionStartTime);
            if (durationMs > 0) {
              const durationHours = durationMs / (1000 * 60 * 60);
              gBoxPoints += durationHours * 0.25;
            }
          });
        }
        totalEarnings += gBoxPoints;

        transaction.update(targetUserDocRef, {
          unclaimedCoins: increment(totalEarnings),
          miningStartTime: null,
          sessionEndTime: null,
          sessionBaseEarnings: 0, 
          sessionReferralEarnings: 0,
          sessionMissedCoinEarnings: 0,
          kuberBlocks: [],
        });
      });
    } catch (error) {
      console.error("Error finalizing session on client:", error);
      toast({ title: 'Finalization Error', description: 'Could not finalize the session.', variant: 'destructive' });
    }
  }, [firestore, toast]);

  const adminStartUserSession = useCallback(async (userId: string) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'You do not have permission.', variant: 'destructive' });
      throw new Error('Not an admin');
    }

    const targetUserDocRef = doc(firestore, 'users', userId);
    try {
      const userDoc = await getDoc(targetUserDocRef);
      if (!userDoc.exists()) throw new Error("User not found.");

      const profile = userDoc.data() as UserProfile;
      if (profile.sessionEndTime && Date.now() < profile.sessionEndTime) {
        throw new Error("This user already has an active mining session.");
      }
      
      if(profile.unclaimedCoins && profile.unclaimedCoins > 0) {
          throw new Error("User must claim their previous earnings before starting a new session.");
      }

      const durationInMinutes = await getGlobalSessionDuration();
      const now = Date.now();
      const endTime = now + durationInMinutes * 60 * 1000;

      await updateDoc(targetUserDocRef, {
        miningStartTime: now,
        sessionEndTime: endTime,
        adWatchHistory: [],
        sessionBaseEarnings: 0,
        sessionReferralEarnings: 0,
        kuberBlocks: [],
        kuberRequests: [],
      });

      toast({ title: 'Session Started', description: `Mining session has been started for ${profile.fullName}.` });

    } catch (error: any) {
      console.error("Error starting user session:", error);
      toast({ title: 'Error', description: error.message || 'Could not start the session.', variant: 'destructive' });
      throw error;
    }
  }, [userProfile, firestore, toast, getGlobalSessionDuration]);

  const adminTerminateUserSession = useCallback(async (userId: string) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You do not have permission.', variant: 'destructive' });
        throw new Error('Not an admin');
    }

    try {
        await clientSideFinalizeSession(userId, true);
        toast({ title: 'Session Terminated', description: "The user's session has been successfully terminated." });
    } catch (error: any) {
        console.error("Error terminating user session via client transaction:", error);
        toast({ title: 'Error', description: error.message || 'Could not terminate the session.', variant: 'destructive' });
        throw error;
    }
  }, [userProfile, toast, clientSideFinalizeSession]);

    const creditSpinWinnings = useCallback(async (winnings: number) => {
        if (!user) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                spinWinnings: increment(winnings),
                spinCount: increment(1),
            });
        } catch (error) {
            console.error("Failed to credit spin winnings:", error);
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: { spinWinnings: increment(winnings) },
                })
            );
        }
    }, [user, firestore]);
  
  const applySpinWinnings = useCallback(async (finalWinnings: number, adWatched: boolean) => {
    if (!user || !userProfile) return;
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found");
            
            const currentProfile = userDoc.data() as UserProfile;
            const currentSpinCount = currentProfile.spinCount || 0;
            const newSpinCount = currentSpinCount + 1;

            const updatePayload: { [key: string]: any } = {
                spinWinnings: increment(finalWinnings),
                spinCount: newSpinCount,
            };

            if (adWatched) {
                const adEvent: AdWatchEvent = {
                    id: doc(collection(firestore, 'temp')).id,
                    element: `Spin Wheel`,
                    timestamp: Date.now(),
                };
                updatePayload.adWatchHistory = arrayUnion(adEvent);
                updatePayload.spinAdWatchCount = increment(1);
            }

            if (newSpinCount >= 2) {
                const sessionDuration = await getGlobalSessionDuration();
                updatePayload.spinCooldownEnd = Date.now() + sessionDuration * 60 * 1000;
            }

            transaction.update(userDocRef, updatePayload);
        });
        
        // Optimistic UI update
        setUserProfile(prev => {
            if (!prev) return null;
            const newSpinCount = (prev.spinCount || 0) + 1;
            const updates: Partial<UserProfile> = {
                spinWinnings: (prev.spinWinnings || 0) + finalWinnings,
                spinCount: newSpinCount,
                spinAdWatchCount: adWatched ? (prev.spinAdWatchCount || 0) + 1 : prev.spinAdWatchCount
            };
            if (adWatched) {
                updates.adWatchHistory = [...(prev.adWatchHistory || []), { id: '', element: 'Spin Wheel', timestamp: Date.now() }];
            }
            if (newSpinCount >= 2) {
                updates.spinCooldownEnd = Date.now() + 480 * 60 * 1000; // Assume 8 hours for optimistic update
            }
            return { ...prev, ...updates };
        });

        toast({ title: 'Reward Claimed!', description: `You've received ${finalWinnings.toFixed(4)} BLIT!` });
    } catch (error) {
        console.error("Error applying spin winnings:", error);
        toast({ title: 'Error', description: 'Could not claim your reward.', variant: 'destructive' });
    }
  }, [user, userProfile, firestore, getGlobalSessionDuration, toast]);

  const updateMiningRate = useCallback((type: CooldownType, rateIncrease: number, adWatched: boolean) => {
    if (!user || !userProfile) return;
    
    const userDocRef = doc(firestore, 'users', user.uid);
    const now = Date.now();
    const hours = parseInt(type.replace('H', ''));
    
    const sessionEndTime = userProfile.sessionEndTime;
    const boostDurationMs = hours * 60 * 60 * 1000;
    
    let boostEndTime = now + boostDurationMs;
    if (sessionEndTime && boostEndTime > sessionEndTime) {
      boostEndTime = sessionEndTime;
    }

    const newBoost: ActiveBoost = {
      id: doc(collection(firestore, 'temp')).id,
      type: type,
      rate: rateIncrease,
      startTime: now,
      endTime: boostEndTime,
      adWatched: adWatched
    };
    
    const updatePayload: { activeBoosts: any, adWatchHistory?: any } = {
      activeBoosts: arrayUnion(newBoost)
    };

    if (adWatched) {
        const adEvent: AdWatchEvent = {
            id: doc(collection(firestore, 'temp')).id,
            element: `${type} Mystery Box`,
            timestamp: Date.now(),
        };
        updatePayload.adWatchHistory = arrayUnion(adEvent);
    }

    updateDocumentNonBlocking(userDocRef, updatePayload);
  }, [user, userProfile, firestore]);
  
  const applyReferralCode = useCallback(async (profileCode: string) => {
    if (!user || !userProfile) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to apply a code.', variant: 'destructive' });
        throw new Error("User not authenticated or profile not loaded.");
    }
    if (userProfile.referredBy) {
        toast({ title: 'Code Already Applied', description: 'You have already used a referral code.', variant: 'destructive' });
        throw new Error("Code Already Applied");
    }

    // Quick frontend check to prevent unnecessary backend calls
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('profileCode', '==', profileCode.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        toast({ title: 'Error', description: "The profile code you entered is not valid.", variant: 'destructive' });
        throw new Error("The profile code you entered is not valid.");
    }
    const referrerData = querySnapshot.docs[0].data() as UserProfile;
    
    const refereeDevices = userProfile.deviceNames || [];
    const referrerDevices = referrerData.deviceNames || [];
    if (refereeDevices.some(device => referrerDevices.includes(device))) {
        toast({ title: 'Error', description: "Cannot apply referral to an account using the same device.", variant: 'destructive' });
        throw new Error("Same device conflict.");
    }

    try {
        const functions = getFunctions();
        const applyReferralFn = httpsCallable(functions, 'applyReferralCode');
        const result = await applyReferralFn({ referrerCode: profileCode });
        const data = result.data as { success: boolean; message: string };

        if (data.success) {
            toast({ title: 'Referral Success!', description: data.message });
        } else {
            // This case might not be reached if the cloud function throws HttpsError
            throw new Error(data.message || 'An unknown error occurred.');
        }

    } catch (error: any) {
        console.error("Error applying referral code via cloud function:", error);
        const errorMessage = error.message || 'Failed to apply referral code.';
        toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        throw error;
    }
  }, [user, userProfile, firestore, toast]);

    const adminApplyReferralCode = useCallback(async (referrerCode: string, refereeCode: string) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You do not have permission to perform this action.', variant: 'destructive' });
            return;
        }

        const upperReferrerCode = referrerCode.toUpperCase();
        const upperRefereeCode = refereeCode.toUpperCase();

        if (upperReferrerCode === upperRefereeCode) {
            toast({ title: 'Error', description: 'Referrer and referee codes cannot be the same.', variant: 'destructive' });
            return;
        }

        try {
            const usersRef = collection(firestore, 'users');
            const referrerQuery = query(usersRef, where('profileCode', '==', upperReferrerCode));
            const refereeQuery = query(usersRef, where('profileCode', '==', upperRefereeCode));

            const [referrerSnapshot, refereeSnapshot] = await Promise.all([getDocs(referrerQuery), getDocs(refereeQuery)]);

            if (referrerSnapshot.empty) throw new Error("Referrer with that code not found.");
            if (refereeSnapshot.empty) throw new Error("Referee with that code not found.");

            const referrerDoc = referrerSnapshot.docs[0];
            const refereeDoc = refereeSnapshot.docs[0];
            const refereeData = refereeDoc.data() as UserProfile;
            
            const batch = writeBatch(firestore);

            // If the referee already has a referrer, undo the old relationship
            if (refereeData.referredBy) {
                const oldReferrerDocRef = doc(firestore, 'users', refereeData.referredBy);
                 const oldReferrerDoc = await getDoc(oldReferrerDocRef);
                if (oldReferrerDoc.exists()) {
                    batch.update(oldReferrerDocRef, {
                        referrals: arrayRemove(refereeDoc.id)
                    });
                }
            }

            // Set the new relationship for the referee
            batch.update(refereeDoc.ref, {
                referredBy: referrerDoc.id,
                referredByName: referrerDoc.data().fullName,
                referralAppliedAt: serverTimestamp(),
            });

            // Add referee to the new referrer's security circle
            batch.update(referrerDoc.ref, {
                referrals: arrayUnion(refereeDoc.id)
            });

            await batch.commit();

            toast({ title: 'Referral Applied', description: `Successfully applied referral from ${referrerDoc.data().fullName} to ${refereeDoc.data().fullName}.` });

        } catch (error: any) {
            console.error("Error in adminApplyReferralCode:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }

    }, [userProfile, firestore, toast]);

  const transferCoins = useCallback(async (recipientId: string, recipientName: string, amount: number) => {
    if (!user || !userProfile) {
      toast({ title: 'Not signed in', variant: 'destructive' });
      throw new Error("Not signed in");
    }

    if ((userProfile.lastTransactionTimestamp || 0) > Date.now() - 24 * 60 * 60 * 1000) {
      toast({ title: 'Cooldown Active', description: 'You can only send coins once every 24 hours.', variant: 'destructive' });
      throw new Error("24-hour cooldown is active.");
    }

    try {
        const usersRef = collection(firestore, 'users');
        const recipientDocRef = doc(usersRef, recipientId);
        const recipientDoc = await getDoc(recipientDocRef);

        if (!recipientDoc.exists()) {
            throw new Error("Recipient account not found.");
        }
        const recipientProfile = recipientDoc.data() as UserProfile;
        
        // Rule 1: Direct device conflict
        const senderDevices = userProfile.deviceNames || [];
        const receiverDevices = recipientProfile.deviceNames || [];
        const hasCommonDevice = senderDevices.some(device => receiverDevices.includes(device));
        
        if (hasCommonDevice) {
            throw new Error("Transfer blocked: Sender and receiver have used the same device.");
        }
        
        // Rule 2: Indirect device conflict
        if (senderDevices.length > 0) {
            const conflictQuery = query(
                usersRef,
                where('deviceNames', 'array-contains-any', senderDevices)
            );
            const conflictSnapshot = await getDocs(conflictQuery);
            if (conflictSnapshot.size > 1) { // More than just the sender
                const otherAccountIds = conflictSnapshot.docs.map(d => d.id).filter(id => id !== user.uid);
                
                const transactionsFromOtherAccounts = await getDocs(query(
                    collection(firestore, 'transactions'),
                    where('senderId', 'in', otherAccountIds),
                    where('receiverId', '==', recipientId)
                ));

                if (!transactionsFromOtherAccounts.empty) {
                    throw new Error("Transfer blocked: Another account on this device has already sent coins to this recipient.");
                }
            }
        }
        
        const newTransactionRef = doc(collection(firestore, 'transactions'));
        const newPendingTransferRef = doc(collection(firestore, 'pendingTransfers'));
        
        const transactionId = newTransactionRef.id;

        await runTransaction(firestore, async (transaction) => {
            const senderDocRef = doc(firestore, 'users', user.uid);
            
            const newTransaction: Omit<Transaction, 'id' | 'completedAt'> = {
                senderId: user.uid,
                senderName: userProfile.fullName,
                receiverId: recipientId,
                receiverName: recipientName,
                amount: amount,
                status: 'pending',
                createdAt: serverTimestamp() as any,
            };
            transaction.set(newTransactionRef, newTransaction);
            
            transaction.update(senderDocRef, { 
                minedCoins: increment(-amount),
                lastTransactionTimestamp: serverTimestamp()
            });

            const pendingTransferData: PendingTransfer = {
                id: newPendingTransferRef.id,
                transactionId: transactionId,
                senderId: user.uid,
                senderName: userProfile.fullName,
                receiverId: recipientId,
                receiverName: recipientName,
                amount,
                status: 'pending',
                createdAt: newTransaction.createdAt
            };
            transaction.set(newPendingTransferRef, pendingTransferData);
        });

        toast({ title: 'Transfer Request Sent', description: `Your request to send ${amount} BLIT will be authenticated by the Blistree team.` });
    } catch (error: any) {
        if (error.message.includes('flagged this request') || error.message.includes('blocked')) {
             toast({ title: 'Transfer Blocked', description: error.message, variant: 'destructive' });
        } else {
            console.error("Transfer error:", error);
            toast({ title: 'Transfer Failed', description: error.message, variant: 'destructive' });
        }
        throw error;
    }
  }, [user, userProfile, firestore, toast]);


  const respondToTransfer = useCallback(async (transferId: string, approve: boolean) => {
    if (!user || !userProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
      return;
    }

    const transferDocRef = doc(firestore, 'pendingTransfers', transferId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const transferDoc = await transaction.get(transferDocRef);
            if (!transferDoc.exists()) {
                throw new Error("This transfer request no longer exists.");
            }
            
            const transferData = transferDoc.data() as PendingTransfer;
            const senderRef = doc(firestore, 'users', transferData.senderId);
            const receiverRef = doc(firestore, 'users', user.uid);

            const senderDoc = await transaction.get(senderRef);
            if (!senderDoc.exists()) {
                throw new Error("Sender's account not found.");
            }
            
            const senderProfile = senderDoc.data() as UserProfile;
            const newTransactionDocRef = doc(collection(firestore, 'transactions'));
            
            const baseTransaction: Partial<Transaction> = {
                senderId: transferData.senderId,
                senderName: transferData.senderName,
                receiverId: transferData.receiverId,
                receiverName: transferData.receiverName,
                amount: transferData.amount,
                createdAt: transferData.createdAt,
                completedAt: serverTimestamp() as any,
            };

            if (approve) {
                if (senderProfile.minedCoins < transferData.amount) {
                    throw new Error("Sender has insufficient funds for this transfer.");
                }
                
                transaction.update(senderRef, { minedCoins: increment(-transferData.amount) });
                transaction.update(receiverRef, { minedCoins: increment(transferData.amount) });
                
                transaction.set(newTransactionDocRef, { ...baseTransaction, status: 'completed' });
                
            } else {
                transaction.set(newTransactionDocRef, { ...baseTransaction, status: 'rejected' });
            }
            
            transaction.delete(transferDocRef);
        });

        toast({ title: 'Transfer Responded', description: `You have ${approve ? 'approved' : 'rejected'} the transfer.` });

    } catch (error: any) {
        console.error('Error responding to transfer:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
    }
}, [user, userProfile, firestore, toast]);

const respondToTransferByAdmin = useCallback(async (transferId: string, senderId: string, receiverId: string, amount: number, action: 'approve' | 'reject', comment?: string, transactionId?: string): Promise<void> => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'Only admins can perform this action.', variant: 'destructive' });
        return;
    }

    if (!transactionId) {
        toast({ title: 'Error', description: 'Transaction ID is missing.', variant: 'destructive' });
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const transactionDocRef = doc(firestore, 'transactions', transactionId);
            const senderDocRef = doc(firestore, 'users', senderId);

            if (action === 'approve') {
                const receiverDocRef = doc(firestore, 'users', receiverId);
                transaction.update(receiverDocRef, { minedCoins: increment(amount) });
                transaction.update(transactionDocRef, { status: 'completed', adminComment: comment || null, completedAt: serverTimestamp() });
            } else { // Reject
                transaction.update(senderDocRef, { minedCoins: increment(amount) });
                transaction.update(transactionDocRef, { status: 'rejected', adminComment: comment || null, completedAt: serverTimestamp() });
            }

            const pendingTransferDocRef = doc(firestore, 'pendingTransfers', transferId);
            transaction.delete(pendingTransferDocRef);
        });

        toast({ title: `Transfer ${action === 'approve' ? 'Approved' : 'Rejected'}`, description: 'The transfer has been processed.' });
    } catch (error: any) {
        console.error("Error responding to transfer:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
    }
}, [firestore, userProfile, toast]);


    const sendNotificationToUser = useCallback(async (profileCode: string, message: string) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
            throw new Error("User is not an admin.");
        }

        try {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('profileCode', '==', profileCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error("User with that profile code not found.");
            }

            const userDoc = querySnapshot.docs[0];
            const targetUserRef = doc(firestore, 'users', userDoc.id);

            await updateDoc(targetUserRef, {
                notifications: arrayUnion(message)
            });

            toast({ title: 'Notification Sent', description: 'The message has been sent to the user.' });
        } catch (error: any) {
            console.error("Error sending notification:", error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            throw error;
        }
    }, [userProfile, firestore, toast]);

    const clearUserNotifications = useCallback(async () => {
        if (!user) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
            await updateDoc(userDocRef, {
                notifications: []
            });
        } catch (error) {
            console.error("Error clearing notifications:", error);
            toast({ title: 'Error', description: 'Could not clear notifications.', variant: 'destructive' });
        }
    }, [user, firestore, toast]);
  
  const requestWithdrawal = useCallback(async (details: Partial<WithdrawalRequest>) => {
    if (!user || !userProfile) {
      toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
      throw new Error("User not authenticated.");
    }
  
    const lastRequest = userProfile.withdrawalRequests?.slice(-1)[0];
    if (lastRequest) {
        const lastRequestDate = new Date(lastRequest.createdAt);
        if (differenceInHours(new Date(), lastRequestDate) < 24) {
            toast({ title: 'Request Limit', description: 'You can only make one withdrawal request every 24 hours.', variant: 'destructive' });
            throw new Error("One withdrawal request per 24 hours allowed.");
        }
    }
  
    const newRequest: Partial<WithdrawalRequest> = {
      requestId: doc(collection(firestore, 'users')).id,
      withdrawalMethod: details.withdrawalMethod!,
      requestedAmount: details.requestedAmount!,
      availableCoins: userProfile.minedCoins || 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      requestType: details.requestType,
    };
  
    if (details.withdrawalMethod === 'upi') {
        newRequest.upiId = details.upiId;
    } else if (details.withdrawalMethod === 'bank') {
        newRequest.bankName = details.bankName;
        newRequest.accountHolderName = details.accountHolderName;
        newRequest.accountNumber = details.accountNumber;
        newRequest.ifscCode = details.ifscCode;
    }
  
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        withdrawalRequests: arrayUnion(newRequest)
      });
  
      toast({
        title: 'Request Submitted',
        description: 'Your withdrawal request has been submitted for review.',
      });
  
    } catch (error: any) {
      console.error("Error submitting withdrawal request:", error);
      const contextualError = new FirestorePermissionError({
          operation: 'update',
          path: userDocRef.path,
          requestResourceData: { withdrawalRequests: arrayUnion(newRequest) }
      });
      errorEmitter.emit('permission-error', contextualError);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your request. Please try again.',
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [user, userProfile, firestore, toast]);

  const adminUpdateUserCoins = useCallback(async (userId: string, amount: number) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'You do not have permission to perform this action.', variant: 'destructive' });
      return;
    }
    const targetUserDocRef = doc(firestore, 'users', userId);
    try {
      await updateDoc(targetUserDocRef, {
        minedCoins: increment(amount)
      });
      toast({ title: 'Success', description: `Successfully updated user's coin balance by ${amount}.` });
    } catch (error: any) {
      console.error("Error updating user coins:", error);
      toast({ title: 'Error', description: "Failed to update user's coins.", variant: 'destructive' });
      throw error;
    }
  }, [userProfile, firestore, toast]);
  
  const adminRemoveReferral = useCallback(async (userId: string, referralId: string) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
        throw new Error("User is not an admin.");
    }
    const userDocRef = doc(firestore, 'users', userId);
    const referralDocRef = doc(firestore, 'users', referralId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found.");
            
            transaction.update(userDocRef, {
                referrals: arrayRemove(referralId),
            });

            transaction.update(referralDocRef, {
                referredBy: null,
                referredByName: null
            });
        });

        toast({ title: 'Referral Removed', description: 'The referral has been successfully removed.' });
    } catch (error: any) {
        console.error("Error removing referral:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
    }
}, [userProfile, firestore, toast]);


    const setGlobalBaseMiningRate = useCallback(async (newRate: number) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
            throw new Error("User is not an admin.");
        }

        const usersRef = collection(firestore, 'users');
        try {
            const querySnapshot = await getDocs(usersRef);
            const batch = writeBatch(firestore);
            querySnapshot.forEach((userDoc) => {
                const userRef = doc(firestore, 'users', userDoc.id);
                batch.update(userRef, { baseMiningRate: newRate });
            });
            await batch.commit();
            toast({ title: 'Success', description: `Global base mining rate has been updated to ${newRate} tokens/hour.` });
        } catch (error: any) {
            console.error("Error setting global mining rate:", error);
            toast({ title: 'Error', description: 'Failed to update the global mining rate.', variant: 'destructive' });
            throw error;
        }
    }, [userProfile, firestore, toast]);

    const setGlobalSessionDuration = useCallback(async (minutes: number) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
            throw new Error("User is not an admin.");
        }
        const configDocRef = doc(firestore, 'config', 'session');
        try {
            await setDoc(configDocRef, { durationMinutes: minutes }, { merge: true });
            toast({ title: 'Success', description: `Global session duration has been updated to ${minutes} minutes.` });
        } catch (error: any) {
             toast({ title: 'Error', description: 'Failed to update the session duration.', variant: 'destructive' });
             throw error;
        }
    }, [userProfile, firestore, toast]);

    const grantBonusSpins = useCallback(async (spinCount: number) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
            throw new Error("User is not an admin.");
        }

        const usersRef = collection(firestore, 'users');
        try {
            const querySnapshot = await getDocs(usersRef);
            const batch = writeBatch(firestore);
            querySnapshot.forEach((userDoc) => {
                const userRef = doc(firestore, 'users', userDoc.id);
                const currentSpinCount = userDoc.data().spinCount || 0;
                const newSpinCount = Math.max(0, currentSpinCount - spinCount);
                batch.update(userRef, { spinCount: newSpinCount });
            });
            await batch.commit();
            toast({ title: 'Success', description: `${spinCount} bonus spin(s) granted to all users.` });
        } catch (error: any) {
            console.error("Error granting bonus spins:", error);
            toast({ title: 'Error', description: 'Failed to grant bonus spins.', variant: 'destructive' });
            throw error;
        }
    }, [userProfile, firestore, toast]);

    const sendUniversalMessage = useCallback(async (message: string) => {
        const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
        if (!isAdmin) {
            toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
            throw new Error("User is not an admin.");
        }

        const messageDocRef = doc(firestore, 'universal_messages', 'current');
        try {
            await setDoc(messageDocRef, { text: message, updatedAt: serverTimestamp() });
        } catch (error: any) {
            const contextualError = new FirestorePermissionError({
                operation: 'write',
                path: messageDocRef.path,
                requestResourceData: { text: message },
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({ title: 'Error', description: 'Could not save the universal message.', variant: 'destructive' });
            throw error;
        }
    }, [userProfile, firestore, toast]);

    const createSupportChatFromFeedback = useCallback(async (rating: number, feedback: string) => {
        if (!user || !userProfile) {
            toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
            throw new Error("User not authenticated.");
        }

        const userDocRef = doc(firestore, 'users', user.uid);

        try {
            const feedbackMessage: ChatMessage = {
                id: doc(collection(firestore, 'temp')).id,
                senderId: user.uid,
                senderName: userProfile.fullName,
                text: `(${rating}-star review): ${feedback}`,
                timestamp: Timestamp.now(),
                isBot: false,
            };

            const systemMessage: ChatMessage = {
                id: doc(collection(firestore, 'temp')).id,
                senderId: 'system',
                senderName: 'Blistree Support',
                text: 'Our team will get back to you shortly.',
                timestamp: Timestamp.now(),
                isBot: true,
            };
            
            await updateDoc(userDocRef, {
                chat: arrayUnion(feedbackMessage, systemMessage),
                chatStatus: 'open',
                hasUnreadUserMessage: true,
            });

            toast({ title: 'Support Chat Created', description: 'Your feedback has been sent to our support team.' });

        } catch (error: any) {
            const contextualError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { chat: '[...]' },
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({ title: 'Error', description: 'Could not create support chat.', variant: 'destructive' });
            throw error;
        }
    }, [user, userProfile, firestore, toast]);

    const setWithdrawalRate = useCallback(async (userId: string, requestId: string, rate: { amount: number; currency: 'inr' | 'usd'; blistreeCoins: number }) => {
    if (!userProfile?.isAdmin) {
      toast({ title: 'Unauthorized', description: 'You do not have permission.', variant: 'destructive' });
      return;
    }
    const userDocRef = doc(firestore, 'users', userId);
    try {
      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        if (!userDoc.exists()) throw new Error('User not found.');
        
        const userData = userDoc.data() as UserProfile;
        const updatedRequests = (userData.withdrawalRequests || []).map((req) => {
          if (req.requestId === requestId) {
            return {
              ...req,
              rateAmount: rate.amount,
              rateCurrency: rate.currency,
              rateBlistreeCoins: rate.blistreeCoins,
              rateStatus: 'proposed',
            } as WithdrawalRequest;
          }
          return req;
        });
        transaction.update(userDocRef, { withdrawalRequests: updatedRequests });
      });
      toast({ title: 'Rate Sent', description: "The user has been notified of the proposed rate." });
    } catch (error: any) {
      console.error('Error setting withdrawal rate:', error);
      toast({ title: 'Error', description: 'Could not set the withdrawal rate.', variant: 'destructive' });
      throw error;
    }
  }, [userProfile, firestore, toast]);

  const respondToRateProposal = useCallback(async (requestId: string, accepted: boolean) => {
      if (!user || !userProfile) {
          toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
          return;
      }
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        await runTransaction(firestore, async (transaction) => {
          const userDoc = await transaction.get(userDocRef);
          if (!userDoc.exists()) throw new Error('User not found.');

          const userData = userDoc.data() as UserProfile;
          const updatedRequests = (userData.withdrawalRequests || []).map((req) => {
            if (req.requestId === requestId) {
              return { ...req, rateStatus: accepted ? 'accepted' : 'denied' } as WithdrawalRequest;
            }
            return req;
          });
          transaction.update(userDocRef, { withdrawalRequests: updatedRequests });
        });
        toast({ title: 'Proposal Responded', description: `You have ${accepted ? 'accepted' : 'denied'} the rate proposal.` });
      } catch (error: any) {
          console.error("Error responding to rate proposal:", error);
          toast({ title: 'Error', description: 'Could not respond to the rate proposal.', variant: 'destructive' });
      }
  }, [user, userProfile, firestore, toast]);
  
  const deleteAccount = useCallback(async () => {
    if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to delete your account.', variant: 'destructive' });
      throw new Error('User not authenticated.');
    }

    try {
        await user.reload(); // Refresh the user's token
        const idToken = await user.getIdToken(true); // Force refresh

        if (!idToken) {
            throw new Error("Could not retrieve a valid ID token.");
        }
        
        const userDocRef = doc(firestore, 'users', user.uid);
        await deleteDoc(userDocRef);

        // This is the critical step for Firebase Auth. It requires a recent login.
        // By refreshing the token, we minimize the chance of 'auth/requires-recent-login'.
        await deleteUser(user);

        toast({
            title: 'Account Deleted',
            description: 'Your account has been permanently deleted.',
        });
    } catch (error: any) {
        console.error('Error deleting account:', error);
        
        // Handle the specific case where a recent login is still required.
        if (error.code === 'auth/requires-recent-login') {
            toast({
                title: 'Action Required',
                description: 'This is a sensitive action. Please log out and log back in before deleting your account.',
                variant: 'destructive',
                duration: 8000,
            });
        } else {
            toast({
                title: 'Deletion Failed',
                description: 'Could not delete your account. Please try again.',
                variant: 'destructive',
            });
        }
        throw error;
    }
}, [user, firestore, auth, toast]);

const adminDeleteChatMessage = useCallback(async (userId: string, messageId: string) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
        throw new Error("User is not an admin.");
    }
    const userDocRef = doc(firestore, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            const updatedChat = (userData.chat || []).filter(msg => msg.id !== messageId);
            await updateDoc(userDocRef, { chat: updatedChat });
            toast({ title: 'Message Deleted', description: 'The chat message has been removed.' });
        } else {
            throw new Error("User not found.");
        }
    } catch (error: any) {
        console.error("Error deleting chat message:", error);
        toast({ title: 'Error', description: 'Could not delete the message.', variant: 'destructive' });
        throw error;
    }
}, [userProfile, firestore, toast]);

const adminClearOpenChats = useCallback(async () => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
      throw new Error("User is not an admin.");
    }

    try {
      const q = query(collection(firestore, 'users'), where('chatStatus', '==', 'open'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'No Chats', description: 'There are no open chats to clear.' });
        return;
      }

      const batch = writeBatch(firestore);
      querySnapshot.forEach((userDoc) => {
        batch.update(userDoc.ref, { chat: [], chatStatus: null });
      });

      await batch.commit();

      toast({ title: 'Success', description: `Cleared ${querySnapshot.size} open chat(s).` });
    } catch (error) {
      console.error("Error clearing open chats:", error);
      toast({ title: 'Error', description: 'Could not clear open chats.', variant: 'destructive' });
      throw error;
    }
}, [userProfile, firestore, toast]);

const clearKuberSessionLogs = useCallback(async () => {
  if (!user) {
    toast({ title: 'Not authenticated.', variant: 'destructive' });
    return;
  }
  const userDocRef = doc(firestore, 'users', user.uid);
  try {
    await updateDoc(userDocRef, {
      kuberBlocks: [],
    });
    toast({ title: 'Success', description: 'Your Kuber session logs have been cleared.' });
  } catch (error: any) {
    console.error("Error clearing Kuber logs:", error);
    toast({ title: 'Error', description: 'Could not clear session logs.', variant: 'destructive' });
  }
}, [user, firestore, toast]);

const respondToKuberRequest = useCallback(async (request: KuberRequest) => {
    if (!user || !userProfile) {
        toast({ title: 'Not authenticated.', variant: 'destructive' });
        return;
    }
    
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("Current user not found.");

            const userData = userDoc.data() as UserProfile;
            const existingBlock = userData.kuberBlocks?.find(b => b.id === request.id);

            if (existingBlock) {
                // Silently ignore if already processed
                return;
            }

            const newBlock: KuberBlock = {
                id: request.id,
                referralId: request.userName, // Note: This should ideally be a referral ID
                referralName: request.userName,
                userSessionStartTime: request.userSessionStartTime,
                referralSessionEndTime: request.referrerSessionEndTime,
            };

            const updatedKuberApprovalRequests = (userData.kuberApprovalRequests || []).filter(
                (req) => req.id !== request.id
            );
            
            const updatedKuberIds: KuberId[] = [...(userData.kuberIds || [])];
            const existingIdIndex = updatedKuberIds.findIndex(k => k.referralId === request.id); // Assuming request.id is referralId
             if (existingIdIndex > -1) {
                updatedKuberIds[existingIdIndex].lastRequestId = request.id;
            } else {
                updatedKuberIds.push({ referralId: request.userName, referralName: request.userName, lastRequestId: request.id });
            }

            transaction.update(userDocRef, {
                kuberBlocks: arrayUnion(newBlock),
                kuberApprovalRequests: updatedKuberApprovalRequests,
                kuberIds: updatedKuberIds
            });
        });
    } catch (error: any) {
        console.error("Error responding to Kuber request:", error);
        toast({ title: 'Error', description: 'Could not approve the request.', variant: 'destructive' });
    }
}, [user, userProfile, firestore, toast]);

  useEffect(() => {
    if (!user || !userProfile) return;
  
    const sessionEnded = userProfile.sessionEndTime && Date.now() >= userProfile.sessionEndTime;
    const isSessionActiveInDB = !!userProfile.miningStartTime;
  
    if (sessionEnded && isSessionActiveInDB) {
      setIsFinalizing(true);
      clientSideFinalizeSession(user.uid).finally(() => {
        setTimeout(() => setIsFinalizing(false), 2500);
      });
    }
  }, [user, userProfile, clientSideFinalizeSession]);
  
  // This effect will turn off the finalizing state once unclaimedCoins > 0
  useEffect(() => {
    if (userProfile && userProfile.unclaimedCoins && userProfile.unclaimedCoins > 0) {
      setIsFinalizing(false);
    }
  }, [userProfile?.unclaimedCoins]);
  
    // Effect to generate daily coins based on claimed history
    useEffect(() => {
        if (!user || !userProfile) return;

        const generateAndFilterDailyCoins = () => {
            const now = new Date();
            const schedule = ['22:00', '16:00', '12:00', '08:00']; // From latest to earliest
            
            // 1. Calculate the last 8 valid slots
            const last8Slots: { id: string, availableAt: Date }[] = [];
            const tempDate = new Date(now);

            while (last8Slots.length < 8) {
                for (const timeSlot of schedule) {
                    if (last8Slots.length >= 8) break;

                    const [hour, minute] = timeSlot.split(':').map(Number);
                    const slotTime = new Date(tempDate);
                    slotTime.setHours(hour, minute, 0, 0);

                    if (slotTime <= now) {
                        const year = slotTime.getFullYear();
                        const month = String(slotTime.getMonth() + 1).padStart(2, '0');
                        const day = String(slotTime.getDate()).padStart(2, '0');
                        const id = `${year}-${month}-${day}-${timeSlot}`;
                        last8Slots.push({ id, availableAt: slotTime });
                    }
                }
                tempDate.setDate(tempDate.getDate() - 1);
            }

            // 2. Prune old/invalid claimed IDs from Firestore
            const validSlotIds = new Set(last8Slots.map(s => s.id));
            const userClaimedIds = userProfile.dailyClaimedCoins || [];
            const newClaimedIds = userClaimedIds.filter(id => validSlotIds.has(id));

            if (newClaimedIds.length !== userClaimedIds.length) {
                const userDocRef = doc(firestore, 'users', user.uid);
                updateDocumentNonBlocking(userDocRef, { dailyClaimedCoins: newClaimedIds });
            }

            // 3. Generate the list of coins to be displayed (available or missed)
            const newGeneratedCoins: DailyAdCoin[] = [];
            const claimedIdSet = new Set(newClaimedIds);

            for (const slot of last8Slots) {
                if (!claimedIdSet.has(slot.id)) {
                    const availableAtTime = slot.availableAt.getTime();
                    const expiresAt = availableAtTime + 30 * 60 * 1000;
                    const finalExpiryAt = availableAtTime + 48 * 60 * 60 * 1000;

                    // Skip fully expired coins that can no longer be claimed even with an ad
                    if (now.getTime() > finalExpiryAt) {
                        continue;
                    }

                    const status: 'available' | 'missed' = (now.getTime() >= availableAtTime && now.getTime() < expiresAt) ? 'available' : 'missed';

                    newGeneratedCoins.push({
                        id: slot.id,
                        status,
                        availableAt: availableAtTime,
                        expiresAt,
                        finalExpiryAt
                    });
                }
            }
            
            // 4. Update the component's state
            setDailyAdCoins(currentCoins => {
                if (JSON.stringify(currentCoins) === JSON.stringify(newGeneratedCoins)) {
                  return currentCoins;
                }
                return newGeneratedCoins;
            });
        };

        generateAndFilterDailyCoins();
        // This effect should run when the user profile changes, e.g., after claiming a coin.
    }, [user, userProfile, firestore]);

const collectDailyAdCoin = useCallback(async (coinId: string): Promise<number | undefined> => {
    if (!user) return;

    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimDailyCoin');
        const result = await claimFunction({ coinId, isMissed: false });
        const data = result.data as { success: boolean, claimedAmount: number };
        
        if (data.success) {
            return data.claimedAmount;
        }
        return undefined;

    } catch(error: any) {
        console.error("Error collecting daily coin:", error);
        toast({ title: 'Error', description: error.message || 'Could not collect the coin.', variant: 'destructive' });
    }
}, [user, toast]);

const claimMissedAdCoin = useCallback(async (coinId: string, adElement: string): Promise<number | undefined> => {
    if (!user || !userProfile) return;
    
    if (!userProfile.adsUnlocked) {
        console.log("Ads not unlocked for this user yet.");
        return;
    }

    try {
        const functions = getFunctions();
        const claimFunction = httpsCallable(functions, 'claimDailyCoin');
        
        // Command to show the ad on Android
        if (window.Android && typeof window.Android.showRewardedAd === 'function') {
            window.Android.showRewardedAd();
        }
        
        const result = await claimFunction({ coinId, isMissed: true, adElement });
        const data = result.data as { success: boolean, claimedAmount: number };
        
        if (data.success) {
            startAdCooldown(); // Start UI cooldown after successful claim
            return data.claimedAmount;
        }
        return undefined;

    } catch (error: any) {
        console.error("Error claiming missed coin:", error);
        toast({ title: 'Error', description: error.message || 'Could not claim the missed coin.', variant: 'destructive' });
    }
}, [user, userProfile, toast, startAdCooldown]);

const requestFollow = useCallback(async (platform: 'facebook' | 'x', profileName: string) => {
    if (!user) {
      toast({ title: 'Not signed in', description: 'You must be logged in to do that.', variant: 'destructive' });
      return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    const fieldToUpdate = platform === 'facebook' ? 'followStatusFacebook' : 'followStatusX';
    const nameField = platform === 'facebook' ? 'facebookProfileName' : 'xProfileName';
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found");
            
            const currentStatus = userDoc.data()?.[fieldToUpdate];
            if (currentStatus === 'followed') {
                return; // Do nothing if already followed
            }

            transaction.update(userDocRef, {
                [fieldToUpdate]: 'followed',
                [nameField]: profileName,
                minedCoins: increment(10)
            });
        });
        toast({ title: 'Follow Approved!', description: `You've been rewarded 10 BLIT for following on ${platform}.` });
    } catch (error) {
        console.error(`Error requesting follow for ${platform}:`, error);
        toast({ title: 'Error', description: 'Could not submit your follow for verification.', variant: 'destructive' });
    }
}, [user, firestore, toast]);

  const approveFollowRequest = useCallback(async (userId: string, platform: 'facebook' | 'x') => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
        return;
    }
    const userDocRef = doc(firestore, 'users', userId);
    const fieldToUpdate = platform === 'facebook' ? 'followStatusFacebook' : 'followStatusX';
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found");

            const currentStatus = userDoc.data()?.[fieldToUpdate];
            if (currentStatus === 'followed') {
                // Already followed, do nothing
                return;
            }

            transaction.update(userDocRef, {
                [fieldToUpdate]: 'followed',
                minedCoins: increment(10) // Reward the user with 10 coins
            });
        });

        toast({ title: 'Follow Approved', description: `The user has been marked as a follower and rewarded 10 coins.` });
    } catch (error) {
        console.error(`Error approving follow for ${platform}:`, error);
        toast({ title: 'Approval Failed', description: 'Could not approve the follow request.', variant: 'destructive' });
    }
}, [userProfile, firestore, toast]);
  
const disapproveFollowRequest = useCallback(async (userId: string, platform: 'facebook' | 'x') => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
        return;
    }
    const userDocRef = doc(firestore, 'users', userId);
    const fieldToUpdate = platform === 'facebook' ? 'followStatusFacebook' : 'followStatusX';
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found");

            const updatePayload: { [key: string]: any } = { [fieldToUpdate]: null };

            transaction.update(userDocRef, updatePayload);
        });

        toast({ title: 'Follow Status Updated', description: `The user's follow status has been reset.` });
    } catch (error) {
        console.error(`Error disapproving follow for ${platform}:`, error);
        toast({ title: 'Update Failed', description: 'Could not update the follow status.', variant: 'destructive' });
    }
}, [userProfile, firestore, toast]);

const adminSetFollowStatus = useCallback(async (userId: string, platform: 'facebook' | 'x', status: 'followed' | 'pending' | null) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
        toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
        throw new Error("User is not an admin.");
    }
    const userDocRef = doc(firestore, 'users', userId);
    const fieldToUpdate = platform === 'facebook' ? 'followStatusFacebook' : 'followStatusX';
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) throw new Error("User not found");

            const currentStatus = userDoc.data()?.[fieldToUpdate];
            const updatePayload: { [key: string]: any } = { [fieldToUpdate]: status };

            // Logic to grant coins, but not revoke
            if (status === 'followed' && currentStatus !== 'followed') {
                updatePayload.minedCoins = increment(10);
            }
            
            transaction.update(userDocRef, updatePayload);
        });

        toast({ title: 'Status Updated', description: `User's ${platform} follow status has been updated.` });
    } catch (error: any) {
        console.error(`Error setting follow status for ${platform}:`, error);
        toast({ title: 'Update Failed', description: 'Could not update the follow status.', variant: 'destructive' });
        throw error;
    }
}, [userProfile, firestore, toast]);

const setUserHasRatedOnPlayStore = useCallback(async () => {
    if (!user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { hasRatedOnPlayStore: true });
    } catch (error) {
      console.error("Error setting hasRatedOnPlayStore flag:", error);
    }
  }, [user, firestore]);

  const updateAirdropConfig = useCallback(async (config: Partial<AirdropConfig>) => {
    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62' || userProfile?.id === 'obaW90LhdhPDvbvh06wWwBfucTk1';
    if (!isAdmin) {
      toast({ title: 'Unauthorized', description: 'You are not an admin.', variant: 'destructive' });
      throw new Error("User is not an admin.");
    }
    const configDocRef = doc(firestore, 'config', 'airdrop');

    try {
      const currentConfigDoc = await getDoc(configDocRef);
      const currentConfig = currentConfigDoc.exists() ? currentConfigDoc.data() as AirdropConfig : { isActive: false };
      
      const isLaunchingNewAirdrop = !currentConfig.isActive && config.isActive === true;

      let expiryDate: Date | null = null;
      if (config.expiryDate) {
        expiryDate = config.expiryDate instanceof Timestamp ? config.expiryDate.toDate() : new Date(config.expiryDate);
        expiryDate.setHours(23, 59, 59, 999);
      }
      
      let bonusDeadline: Date | null = null;
      if (config.bonusDeadline) {
        bonusDeadline = config.bonusDeadline instanceof Timestamp ? config.bonusDeadline.toDate() : new Date(config.bonusDeadline);
        bonusDeadline.setHours(23, 59, 59, 999);
      }

      const dataToUpdate = {
        ...config,
        ...(expiryDate && { expiryDate: Timestamp.fromDate(expiryDate) }),
        ...(bonusDeadline && { bonusDeadline: Timestamp.fromDate(bonusDeadline) })
      };

      await setDoc(configDocRef, dataToUpdate, { merge: true });
      
      if (isLaunchingNewAirdrop) {
        const usersRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const batch = writeBatch(firestore);
        usersSnapshot.forEach(userDoc => {
          const userRef = doc(firestore, 'users', userDoc.id);
          batch.update(userRef, {
            airdropReferralsCount: 0,
            airdropBonusClaimed: false,
            airdropCompletionBonusClaimed: false
          });
        });
        await batch.commit();
        toast({ title: 'Airdrop Launched', description: 'A new airdrop has been started and all user progress has been reset.' });
      } else {
        toast({ title: 'Airdrop Config Updated', description: 'The airdrop configuration has been saved.' });
      }

    } catch (error) {
      console.error("Error updating airdrop config:", error);
      toast({ title: 'Error', description: 'Could not save airdrop configuration.', variant: 'destructive' });
    }
}, [userProfile, firestore, toast]);

const creditCrushOracleInstall = useCallback(async () => {
    if (!user || !userProfile) {
      toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
      throw new Error("Not logged in");
    }
    if (userProfile.crushOracleInstalled) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        crushOracleInstalled: true,
        minedCoins: increment(10)
      });
      toast({
        title: 'Reward Credited!',
        description: '10 BLIT have been added to your wallet.'
      });
    } catch (error) {
      console.error("Error crediting Crush Oracle install:", error);
      toast({
        title: 'Error',
        description: 'Could not credit your reward. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  }, [user, userProfile, firestore, toast]);

  useEffect(() => {
    if (loading || isSigningIn) return;

    const publicPages = ['/auth/login', '/auth/mobile-login', '/auth/mobile-welcome', '/privacy-policy', '/delete-your-data', '/email-verified', '/app-only', '/from-facebook', '/privacy-policy-2'];
    const isPublicPage = publicPages.some(page => pathname.startsWith(page));
    
    if (pathname.startsWith('/from-facebook') || pathname.startsWith('/privacy-policy-2') || pathname.startsWith('/app-only') || pathname.startsWith('/airdrop')) {
        return;
    }

    // If user is not logged in and not on a public page, redirect to login
    if (!user && !isPublicPage) {
      router.push('/auth/login');
    }

    // If user is logged in and on the login page, redirect to home
    if (user && userProfile && (pathname === '/auth/login' || pathname === '/auth/mobile-login')) {
      router.push('/');
    }
  }, [loading, user, userProfile, pathname, router, isSigningIn]);

  const value: AuthContextType = {
    userProfile,
    loading,
    isSigningIn,
    isFinalizing,
    emailVerified,
    logout,
    sendVerificationEmail,
    initializeRecaptcha,
    signInWithPhoneNumber,
    signInWithGoogle,
    confirmOtp,
    verifyPhoneNumber,
    confirmPhoneNumberVerification,
    updateUserProfile,
    updateUserEmail,
    updateUserPhoneNumber,
    updateMiningState,
    claimMinedCoins,
    adminStartUserSession,
    adminTerminateUserSession,
    creditSpinWinnings,
    applySpinWinnings,
    updateMiningRate,
    applyReferralCode,
    adminApplyReferralCode,
    transferCoins,
    respondToTransferByAdmin,
    sendNotificationToUser,
    deleteAccount,
    adminDeleteChatMessage,
    adminClearOpenChats,
    requestWithdrawal,
    adminUpdateUserCoins,
    adminRemoveReferral,
    setGlobalBaseMiningRate,
    setGlobalSessionDuration,
    getGlobalSessionDuration,
    grantBonusSpins,
    clearUserNotifications,
    sendUniversalMessage,
    createSupportChatFromFeedback,
    setWithdrawalRate,
    respondToRateProposal,
    collectDailyAdCoin,
    claimMissedAdCoin,
    totalMiningRate,
    miningRateBreakdown,
    liveCoins,
    allReferrals,
    activeReferrals,
    inactiveReferrals,
    referralsLoading,
    activeReferralsCount,
    totalUserSupportCount,
    showOnboarding,
    setShowOnboarding,
    theme,
    setTheme,
    pendingTransfers,
    respondToTransfer,
    adCooldownEndTime,
    startAdCooldown,
    requestFollow,
    approveFollowRequest,
    disapproveFollowRequest,
    adminSetFollowStatus,
    setUserHasRatedOnPlayStore,
    canWatchAd,
    toast,
    updateAirdropConfig,
    referralEarnings,
    respondToKuberRequest,
    clearKuberSessionLogs,
    creditCrushOracleInstall,
    dailyAdCoins,
    t,
    setLanguage
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


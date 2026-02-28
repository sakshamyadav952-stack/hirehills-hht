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
import type { UserProfile, Transaction, PendingTransfer, WithdrawalRequest, ActiveBoost, DailyAdCoin, SessionConfig, AdWatchEvent, AirdropConfig, KuberBlock, KuberRequest, KuberId, TournamentConfig } from '@/lib/types';
import { useToast, toast as toastFn } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { differenceInHours } from 'date-fns';
import { parsePhoneNumber } from 'libphonenumber-js';

type CooldownType = '2H' | '4H' | '8H';
type Theme = 'light' | 'dark';

interface MiningRateBreakdown {
  base: number;
  boost: number;
  referral: number;
  appliedCode: number;
}

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  isSigningIn: boolean;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateMiningState: (startTime: number | null, endTime: number | null) => Promise<void>;
  claimMinedCoins: () => Promise<number | undefined>;
  getGlobalSessionDuration: () => Promise<number>;
  totalMiningRate: number;
  miningRateBreakdown: MiningRateBreakdown | null;
  liveCoins: number;
  activeReferralsCount: number;
  toast: typeof toastFn;
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [totalMiningRate, setTotalMiningRate] = useState(0.25);
  const [miningRateBreakdown, setMiningRateBreakdown] = useState<MiningRateBreakdown | null>(null);
  const [liveCoins, setLiveCoins] = useState(0);
  const [activeReferralsCount, setActiveReferralsCount] = useState(0);

  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createNewUserProfile = useCallback(async (user: User): Promise<UserProfile> => {
    const userDocRef = doc(firestore, 'users', user.uid);
    const profileCode = await generateUniqueProfileCode(firestore);
    
    const newUserProfileData: Omit<UserProfile, 'id' | 'createdAt' | 'email' | 'mobileNumber'> = {
        fullName: user.displayName || `User${profileCode}`,
        gender: 'other', 
        profileCode,
        minedCoins: 0,
        unclaimedCoins: 0,
        miningStartTime: null,
        sessionEndTime: null,
        spinCount: 0,
        spinCooldownEnd: null,
        baseMiningRate: 0.25,
        referrals: [],
        profileImageUrl: user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.uid}`,
        adsUnlocked: true,
        unreadSupportRepliesCount: 0
    };
    
    await setDoc(userDocRef, { ...newUserProfileData, createdAt: serverTimestamp(), email: user.email || '' });
    return { ...newUserProfileData, id: user.uid, createdAt: Timestamp.now(), email: user.email || '', mobileNumber: '' } as UserProfile;
  }, [firestore]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    return onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setUserProfile({ id: snap.id, ...snap.data() } as UserProfile);
        setActiveReferralsCount((snap.data().referrals || []).length);
      }
      setProfileLoading(false);
    });
  }, [user, firestore]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const calculateLive = () => {
      if (!userProfile) return;
      const now = Date.now();
      const base = userProfile.baseMiningRate || 0.25;
      const referral = (userProfile.referrals?.length || 0) * 0.1;
      const appliedCode = userProfile.appliedCodeBoost || 0;
      
      let boost = 0;
      (userProfile.activeBoosts || []).forEach(b => {
        if (now < b.endTime) boost += b.rate;
      });

      const rate = base + referral + appliedCode + boost;
      setTotalMiningRate(rate);
      setMiningRateBreakdown({ base, boost, referral, appliedCode });

      if (userProfile.sessionEndTime && now < userProfile.sessionEndTime && userProfile.miningStartTime) {
        const elapsed = (now - userProfile.miningStartTime) / 3600000;
        setLiveCoins(userProfile.unclaimedCoins + (rate * elapsed));
      } else {
        setLiveCoins(userProfile.unclaimedCoins || 0);
      }
    };

    calculateLive();
    interval = setInterval(calculateLive, 1000);
    return () => clearInterval(interval);
  }, [userProfile]);

  const signInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(firestore, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await createNewUserProfile(result.user);
      }
      router.push('/');
    } finally {
      setIsSigningIn(false);
    }
  }, [auth, firestore, createNewUserProfile, router]);

  const logout = useCallback(async () => {
    await signOut(auth);
    router.push('/auth/login');
  }, [auth, router]);

  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    await updateDoc(doc(firestore, 'users', user.uid), data);
  }, [user, firestore]);

  const updateMiningState = useCallback(async (start: number | null, end: number | null) => {
    if (!user) return;
    await updateDoc(doc(firestore, 'users', user.uid), {
      miningStartTime: start,
      sessionEndTime: end,
      unclaimedCoins: start ? 0 : userProfile?.unclaimedCoins || 0
    });
  }, [user, userProfile, firestore]);

  const claimMinedCoins = useCallback(async () => {
    if (!user || !userProfile) return;
    const amount = userProfile.unclaimedCoins;
    await updateDoc(doc(firestore, 'users', user.uid), {
      minedCoins: increment(amount),
      unclaimedCoins: 0
    });
    return amount;
  }, [user, userProfile, firestore]);

  const getGlobalSessionDuration = useCallback(async () => {
    const snap = await getDoc(doc(firestore, 'config', 'session'));
    return snap.exists() ? snap.data().durationMinutes : 480;
  }, [firestore]);

  const value = {
    userProfile,
    loading: isAuthLoading || isProfileLoading,
    isSigningIn,
    logout,
    signInWithGoogle,
    updateUserProfile,
    updateMiningState,
    claimMinedCoins,
    getGlobalSessionDuration,
    totalMiningRate,
    miningRateBreakdown,
    liveCoins,
    activeReferralsCount,
    toast
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
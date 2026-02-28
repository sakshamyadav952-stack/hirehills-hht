import { Timestamp } from "firebase/firestore";

export type AdWatchEvent = {
  id: string;
  element: string;
  timestamp: number;
};

export type ActiveBoost = {
  id: string;
  type: '2H' | '4H' | '8H';
  rate: number;
  startTime: number;
  endTime: number;
  adWatched?: boolean;
};

export type DailyAdCoin = {
  id: string;
  status: 'available' | 'collected' | 'missed' | 'pending';
  availableAt: number;
  expiresAt: number;
  finalExpiryAt?: number;
  collectedAt?: number;
  collectedFromStatus?: 'available' | 'missed';
};

export type PrizeTier = {
  id: string;
  startRank: number;
  endRank: number;
  prize: number;
};

export type TournamentConfig = {
  id: string;
  headline: string;
  tagline: string;
  startDate?: Timestamp | Date;
  endDate: Timestamp | Date;
  prizeTiers: PrizeTier[];
  isActive: boolean;
};

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  phoneVerified?: boolean;
  gender: 'male' | 'female' | 'other';
  profileImageUrl?: string;
  profileCode: string;
  country?: string;
  cardNumber?: string;
  minedCoins: number;
  unclaimedCoins: number;
  miningStartTime: number | null;
  sessionEndTime: number | null;
  lastTransactionTimestamp?: number | null;
  spinCount: number;
  spinCooldownEnd: number | null;
  spinWinnings?: number;
  spinAdWatchCount?: number;
  createdAt: Timestamp | { seconds: number, nanoseconds: number };
  activeBoosts?: ActiveBoost[];
  adWatchHistory?: AdWatchEvent[];
  baseMiningRate: number;
  appliedCodeBoost?: number;
  referredBy?: string | null;
  referredByName?: string | null;
  referrals: string[];
  referralAppliedAt?: Timestamp | { seconds: number, nanoseconds: number };
  withdrawalRequests?: WithdrawalRequest[];
  isAdmin?: boolean;
  isPromoter?: boolean;
  notifications?: string[];
  theme?: 'light' | 'dark';
  language?: string;
  dailyClaimedCoins?: string[];
  lastMissedCoinClaimTimestamp?: number;
  adsUnlocked?: boolean;
  hasUnreadAdminMessage?: boolean;
  hasUnreadUserMessage?: boolean;
  chatStatus?: 'open' | 'resolved' | null;
  kuberBlocks?: KuberBlock[];
  kuberRequests?: KuberRequest[];
  kuberApprovalRequests?: KuberRequest[];
  kuberIds?: KuberId[];
  aiMessageCount?: number;
  lastAiMessageReset?: Timestamp;
  tournamentId?: string | null | 'left';
  tournamentScore?: number;
  tournamentScoreLastUpdated?: Timestamp;
  usdcAddress?: string;
  tournamentWinning?: number;
};

export type WithdrawalRequest = {
  requestId: string;
  withdrawalMethod: 'upi' | 'bank';
  upiId?: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  requestedAmount: number;
  availableCoins: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  classification?: 'accepted' | 'rejected' | 'unclassified';
  requestType?: 'coins' | 'funds';
};

export type KuberBlock = {
  id: string;
  referralId: string;
  referralName: string;
  userSessionStartTime: number;
  referralSessionEndTime: number;
};

export type KuberRequest = {
  id: string;
  userName: string;
  userSessionStartTime: number;
  referrerSessionEndTime: number;
};

export type KuberId = {
  referralId: string;
  referralName: string;
  lastRequestId: string;
};

export type PendingTransfer = {
    id: string;
    transactionId: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    amount: number;
    status: 'pending';
    createdAt: Timestamp;
};

export type Transaction = {
    id: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverName: string;
    amount: number;
    status: 'completed' | 'rejected' | 'pending';
    createdAt: Timestamp;
    completedAt?: Timestamp | null;
    adminComment?: string;
};

export type UniversalMessage = {
    text: string;
    updatedAt: Timestamp;
};
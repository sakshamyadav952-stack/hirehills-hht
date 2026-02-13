

import { Timestamp } from "firebase/firestore";

export type AdWatchEvent = {
  id: string;
  element: string; // e.g., '2H Mystery Box', 'Spin Wheel'
  timestamp: number;
};

export type ActiveBoost = {
  id: string; // Unique ID for the boost instance
  type: '2H' | '4H' | '8H';
  rate: number;
  startTime: number;
  endTime: number;
  adWatched?: boolean; // To track if the boost was from an ad
};

export type DailyAdCoin = {
  id: string; // e.g., '2024-01-01-08:00'
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
  prize: number; // in USDC
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

export type ConcludedTournament = {
  id: string; // original config doc id
  headline: string;
  tagline: string;
  startDate?: Timestamp | Date;
  concludedAt: Timestamp;
  endDate: Timestamp | Date;
  prizeTiers: PrizeTier[];
  winners: {
    userId: string;
    fullName: string;
    profileCode: string;
    rank: number;
    score: number;
    prize: number;
  }[];
  payouts: {
    [userId: string]: 'pending' | 'paid' | 'failed';
  };
  isActive: boolean;
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
  adminComment?: string;
  rateAmount?: number;
  rateCurrency?: 'inr' | 'usd';
  rateBlistreeCoins?: number;
  rateStatus?: 'proposed' | 'accepted' | 'denied';
  requestType?: 'coins' | 'funds'; // To distinguish between coin and fund withdrawals
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  isBot?: boolean;
  timestamp: Timestamp;
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

export type PromoterReward = {
  referralId: string;
  referralName: string;
  referralProfileCode: string;
  usdtAmount: number;
  timestamp: Timestamp;
};

export type SecondLevelPromoterReward = {
  directReferralName: string;
  usdtAmount: number;
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
  sessionBaseEarnings?: number;
  sessionReferralEarnings?: number;
  sessionMissedCoinEarnings?: number;
  lastTransactionTimestamp?: number | null;
  spinCount: number;
  spinCooldownEnd: number | null;
  spinWinnings?: number;
  spinAdWatchCount?: number;
  createdAt: Timestamp | { seconds: number, nanoseconds: number }; // Allow for serialized timestamp
  
  // New structure for boosts
  activeBoosts?: ActiveBoost[];
  adWatchHistory?: AdWatchEvent[];

  // Deprecated boost fields - will be removed in a future migration
  miningRate2H?: number;
  cooldownEnd2H?: number | null;
  miningRate4H?: number;
  cooldownEnd4H?: number | null;
  miningRate8H?: number;
  cooldownEnd8H?: number | null;
  
  baseMiningRate: number;
  appliedCodeBoost?: number;
  referredBy?: string | null;
  referredByName?: string | null;
  referrals: string[];
  referralAppliedAt?: Timestamp | { seconds: number, nanoseconds: number };
  coverPhotoUrl?: string;
  withdrawalRequests?: WithdrawalRequest[];
  isAdmin?: boolean;
  isPromoter?: boolean;
  promoterRewards?: PromoterReward[];
  secondLevelPromoterRewards?: { [key: string]: SecondLevelPromoterReward };
  promoterReferralCount?: number;
  notifications?: string[];
  theme?: 'light' | 'dark';
  language?: string;

  dailyClaimedCoins?: string[];
  lastMissedCoinClaimTimestamp?: number;
  
  // Follow status
  followStatusFacebook?: 'pending' | 'followed' | null;
  facebookProfileName?: string;
  followStatusX?: 'pending' | 'followed' | null;
  xProfileName?: string;

  hasRatedOnPlayStore?: boolean;

  airdropReferralsCount?: number;
  airdropBonusClaimed?: boolean;
  airdropCompletionBonusClaimed?: boolean;

  deviceNames?: string[];
  ipAddresses?: string[];
  notes?: Note[]; 
  chat?: ChatMessage[] | null; // Storing chat history as an array of objects
  unreadSupportRepliesCount: number;
  adsUnlocked?: boolean; // New field
  hasUnreadAdminMessage?: boolean;
  hasUnreadUserMessage?: boolean;
  chatStatus?: 'open' | 'resolved' | null; // New field for chat status
  kuberBlocks?: KuberBlock[];
  kuberRequests?: KuberRequest[];
  kuberApprovalRequests?: KuberRequest[];
  kuberIds?: KuberId[];
  aiMessageCount?: number;
  lastAiMessageReset?: Timestamp;
  crushOracleInstalled?: boolean;
  tournamentId?: string | null | 'left';
  tournamentScore?: number;
  tournamentScoreLastUpdated?: Timestamp;
  usdcAddress?: string;
  tournamentWinning?: number;
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

export type AddEmailFormValues = {
  email: string;
};

export type UniversalMessage = {
    text: string;
    updatedAt: Timestamp;
};

export type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
  isReply?: boolean;
  isRead: boolean;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status?: 'pending' | 'resolved';
  comments?: Comment[];
  isReadByAdmin: boolean;
  chatClosed?: boolean;
  initiatedBy?: 'user' | 'admin' | 'feedback';
  rating?: number;
  adminChatName?: string;
};

export type SessionConfig = {
    durationMinutes: number;
};

export type AirdropConfig = {
    isActive: boolean;
    headline: string;
    tagline: string;
    expiryDate: Timestamp | Date;
    referralLimit: number;
    rewardAmount: number;
    bonusDeadline?: Timestamp | Date | null;
    bonusReferralTarget?: number;
    bonusReward?: number;
    completionBonus?: number;
};

export type Review = {
    id: string;
    userId: string;
    userName: string;
    profileCode: string;
    rating: number;
    feedback?: string;
    createdAt: Timestamp;
    wasPlayStorePrompted?: boolean;
    updatedAt?: Timestamp;
};

    
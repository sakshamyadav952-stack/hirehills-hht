

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { UserProfile, TournamentConfig, ConcludedTournament } from "./types";

admin.initializeApp();
const db = admin.firestore();

export const updateTournamentConfig = functions.runWith({ timeoutSeconds: 120 }).https.onCall(async (data, context) => {
    const adminUid = context.auth?.uid;
    if (!adminUid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }
    const adminDoc = await db.collection('users').doc(adminUid).get();
    const isSuperAdmin = adminUid === 'obaW90LhdhPDvbvh06wWwBfucTk1' || adminUid === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
    const isAdminByField = adminDoc.exists && adminDoc.data()?.isAdmin === true;
    if (!isSuperAdmin && !isAdminByField) {
        throw new functions.https.HttpsError("permission-denied", "User must be an admin.");
    }

    const configDocRef = db.collection('config').doc('tournament');
    const config = data as TournamentConfig;

    try {
        const currentConfigDoc = await db.doc('config/tournament').get();
        const currentConfig = currentConfigDoc.exists ? currentConfigDoc.data() as TournamentConfig : { isActive: false, prizeTiers: [] };
        
        const isStoppingTournament = currentConfig.isActive && config.isActive === false;
        
        if (isStoppingTournament) {
            // Logic to finalize the tournament and save winners
            const tournamentId = 'tournament';

            const usersQuery = db.collection('users').where('tournamentId', '==', tournamentId);
            const usersSnapshot = await usersQuery.get();
            const enrolledUsers = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));

            enrolledUsers.sort((a, b) => (b.tournamentScore || 0) - (a.tournamentScore || 0));

            const winners: ConcludedTournament['winners'] = [];
            const payouts: ConcludedTournament['payouts'] = {};

            enrolledUsers.forEach((user, index) => {
                const rank = index + 1;
                const prizeTier = currentConfig.prizeTiers?.find(t => rank >= t.startRank && rank <= t.endRank);
                if (prizeTier && prizeTier.prize > 0) {
                    winners.push({
                        userId: user.id,
                        fullName: user.fullName,
                        profileCode: user.profileCode,
                        rank: rank,
                        score: user.tournamentScore || 0,
                        prize: prizeTier.prize
                    });
                    payouts[user.id] = 'pending';
                }
            });

            const concludedTournamentData: Omit<ConcludedTournament, 'id'> = {
                headline: currentConfig.headline,
                tagline: currentConfig.tagline,
                concludedAt: admin.firestore.Timestamp.now(),
                endDate: currentConfig.endDate,
                prizeTiers: currentConfig.prizeTiers || [],
                winners: winners,
                payouts: payouts,
                isActive: false,
            };

            const batch = db.batch();
            const concludedDocRef = db.collection('concludedTournaments').doc();
            batch.set(concludedDocRef, concludedTournamentData);
            
            // Mark the current tournament as inactive instead of deleting it.
            batch.update(configDocRef, { isActive: false });
            
            // NEW: Update winner documents with their prize
            winners.forEach(winner => {
                const userDocRef = db.collection('users').doc(winner.userId);
                batch.update(userDocRef, {
                    tournamentWinning: admin.firestore.FieldValue.increment(winner.prize)
                });
            });

            await batch.commit();
            return { success: true, message: 'Tournament Stopped. Winner data has been saved.' };

        } else {
             // Standard config update logic
            let endDate: Date | null = null;
            if (config.endDate) {
                endDate = config.endDate instanceof admin.firestore.Timestamp ? config.endDate.toDate() : new Date(config.endDate);
                endDate.setHours(23, 59, 59, 999);
            }
             const dataToUpdate = {
                ...config,
                ...(endDate && { endDate: admin.firestore.Timestamp.fromDate(endDate) })
            };
            await configDocRef.set(dataToUpdate, { merge: true });
            return { success: true, message: 'Tournament configuration has been saved.' };
        }

    } catch (error: any) {
        console.error("Error updating tournament config:", error);
        throw new functions.https.HttpsError("internal", "Could not save tournament configuration.", error.message);
    }
});


export const applyReferralCode = functions
  .runWith({ timeoutSeconds: 30 }) // Set timeout to 30 seconds
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "You must be logged in to apply a referral code.");
    }

    const { referrerCode } = data;
    if (!referrerCode || typeof referrerCode !== 'string') {
        throw new functions.https.HttpsError("invalid-argument", "A valid referrer code must be provided.");
    }
    const refereeUid = context.auth.uid;

    try {
      await db.runTransaction(async (transaction) => {
        const usersRef = db.collection("users");
        const now = admin.firestore.Timestamp.now(); // Generate timestamp on the server

        // --- All READS must happen first ---

        // 1. Get referee document
        const refereeDocRef = usersRef.doc(refereeUid);
        const refereeDoc = await transaction.get(refereeDocRef);

        // 2. Get referrer document
        const referrerQuery = usersRef.where("profileCode", "==", referrerCode.toUpperCase());
        const referrerSnapshot = await transaction.get(referrerQuery);
        
        if (referrerSnapshot.empty) {
          throw new functions.https.HttpsError("not-found", "The referral code you entered is not valid.");
        }
        const referrerDoc = referrerSnapshot.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data() as UserProfile;
        
        // 3. Conditionally get second-level referrer and tournament documents upfront
        let secondLevelReferrerDoc = null;
        if (referrerData.isPromoter === true && referrerData.referredBy) {
            const secondLevelReferrerDocRef = usersRef.doc(referrerData.referredBy);
            secondLevelReferrerDoc = await transaction.get(secondLevelReferrerDocRef);
        }

        let tournamentDoc = null;
        // FIX: The referrer just needs to be enrolled in a tournament, not necessarily be a promoter.
        if (referrerData.tournamentId) {
            const tournamentDocRef = db.collection('config').doc('tournament');
            tournamentDoc = await transaction.get(tournamentDocRef);
        }

        // --- All VALIDATIONS happen after reads ---
        
        if (!refereeDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Your user profile was not found.");
        }
        const refereeData = refereeDoc.data() as UserProfile;

        if (refereeData.referredBy) {
          throw new functions.https.HttpsError("failed-precondition", "You have already applied a referral code.");
        }
        
        if (referrerId === refereeUid) {
          throw new functions.https.HttpsError("invalid-argument", "You cannot use your own referral code.");
        }

        // 3. Security Check: Redo conflict check on the server
        const refereeDevices = refereeData.deviceNames || [];
        const referrerDevices = referrerData.deviceNames || [];
        const hasCommonDevice = refereeDevices.some(device => referrerDevices.includes(device));
        
        const refereeIps = refereeData.ipAddresses || [];
        const referrerIps = referrerData.ipAddresses || [];
        const hasCommonIp = refereeIps.some(ip => referrerIps.includes(ip));

        if (hasCommonDevice && hasCommonIp) {
            throw new functions.https.HttpsError("permission-denied", "Same user detected. Cannot apply referral.");
        }
        
        const rewardAmount = 10;
        
        // --- All WRITES happen last ---

        // 4. Update Referee's Document
        transaction.update(refereeDocRef, {
            referredBy: referrerId,
            referredByName: referrerData.fullName,
            referralAppliedAt: now,
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
            appliedCodeBoost: 0.25,
        });

        // 5. Prepare and update referrer's document
        const referrerUpdateData: { [key: string]: any } = {
            referrals: admin.firestore.FieldValue.arrayUnion(refereeUid),
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
        };

        if (tournamentDoc && tournamentDoc.exists) {
            const tournamentData = tournamentDoc.data();
            // FIX: Check if tournament is active and referrer is enrolled, without checking for promoter status.
            if (tournamentData && tournamentData.isActive && tournamentData.endDate.toMillis() > now.toMillis()) {
                if (referrerData.tournamentId === tournamentDoc.id) {
                    referrerUpdateData.tournamentScore = admin.firestore.FieldValue.increment(1);
                    referrerUpdateData.tournamentScoreLastUpdated = now;
                }
            }
        }

        if (referrerData.isPromoter === true) {
            referrerUpdateData.promoterRewards = admin.firestore.FieldValue.arrayUnion({
                referralId: refereeUid,
                referralName: refereeData.fullName,
                referralProfileCode: refereeData.profileCode,
                usdtAmount: 0.15,
                timestamp: now,
            });
            referrerUpdateData.promoterReferralCount = admin.firestore.FieldValue.increment(1);
        }
        transaction.update(referrerDoc.ref, referrerUpdateData);
        
        // 6. Update second-level referrer document if applicable
        if (secondLevelReferrerDoc && secondLevelReferrerDoc.exists && secondLevelReferrerDoc.data()?.isPromoter === true) {
            const secondLevelData = secondLevelReferrerDoc.data() as UserProfile;
            const currentRewards = secondLevelData.secondLevelPromoterRewards || {};
            const existingReward = currentRewards[referrerId] || { usdtAmount: 0 };
            
            const updatedReward = {
                directReferralName: referrerData.fullName,
                usdtAmount: existingReward.usdtAmount + 0.05,
            };

            transaction.update(secondLevelReferrerDoc.ref, {
                [`secondLevelPromoterRewards.${referrerId}`]: updatedReward
            });
        }
      });

      return { success: true, message: `Success! You and ${referrerCode} both received ${10} BLIT.` };

    } catch (error: any) {
        console.error("Error in applyReferralCode Cloud Function:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while applying the code. Please try again.");
    }
  });


export const finalizeSession = functions.https.onCall(async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
    }

    const callerUid = context.auth.uid;
    // Allow an admin to target a specific user, otherwise target the caller
    const targetUserId = data.userId || callerUid; 

    const callerDocRef = db.collection("users").doc(callerUid);
    const targetUserDocRef = db.collection("users").doc(targetUserId);

    try {
        let sessionEarnings = 0;
        await db.runTransaction(async (transaction) => {
            const [callerDoc, targetUserDoc] = await Promise.all([
                (callerUid === targetUserId) ? Promise.resolve(null) : transaction.get(callerDocRef),
                transaction.get(targetUserDocRef)
            ]);

            if (!targetUserDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Target user document does not exist.");
            }

            // Authorization: Must be the user themselves or an admin
            const isSuperAdmin = callerUid === 'obaW90LhdhPDvbvh06wWwBfucTk1' || callerUid === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
            const callerIsAdmin = (callerDoc && callerDoc.exists && callerDoc.data()?.isAdmin === true) || isSuperAdmin;
            if (callerUid !== targetUserId && !callerIsAdmin) {
                 throw new functions.https.HttpsError(
                    "permission-denied",
                    "You do not have permission to perform this action.",
                );
            }

            const profile = targetUserDoc.data();
            if (!profile) {
                 throw new functions.https.HttpsError("internal", "User profile data is missing.");
            }
            
            const now = Date.now();
            const isSelfFinalize = callerUid === targetUserId;

            // Check if there is a session to finalize
            if (!profile.miningStartTime || !profile.sessionEndTime || (isSelfFinalize && now < profile.sessionEndTime)) {
                 // If called by the user, only run if session is truly over.
                 // If called by an admin, it can run anytime to terminate early.
                 if(isSelfFinalize) {
                    sessionEarnings = 0;
                    return;
                 }
            }

            const sessionStartTime = profile.miningStartTime;
            const effectiveEndTime = isSelfFinalize ? profile.sessionEndTime : now;
            const elapsedTimeHours = (effectiveEndTime - sessionStartTime) / (1000 * 60 * 60);

            const baseRate = profile.baseMiningRate || 0.25;
            const appliedCodeBonus = profile.appliedCodeBoost || 0; 
            
            const finalBaseEarnings = (baseRate + appliedCodeBonus) * elapsedTimeHours;
            let totalEarnings = finalBaseEarnings;

            (profile.activeBoosts || []).forEach((boost: any) => {
              if (effectiveEndTime > boost.startTime) {
                const boostEffectiveEndTime = Math.min(effectiveEndTime, boost.endTime);
                const elapsedBoostTimeMs = boostEffectiveEndTime - boost.startTime;
                if (elapsedBoostTimeMs > 0) {
                  const elapsedBoostTimeHours = elapsedBoostTimeMs / (1000 * 60 * 60);
                  totalEarnings += boost.rate * elapsedBoostTimeHours;
                }
              }
            });
            
            totalEarnings += profile.spinWinnings || 0;
            totalEarnings += profile.sessionMissedCoinEarnings || 0; // THE FIX

            let gBoxPoints = 0;
            if (profile.kuberBlocks) {
                profile.kuberBlocks.forEach((block: any) => {
                    const durationMs = Math.max(0, block.referralSessionEndTime - block.userSessionStartTime);
                    const durationHours = durationMs / (1000 * 60 * 60);
                    gBoxPoints += durationHours * 0.25;
                });
            }
            totalEarnings += gBoxPoints;
            
            sessionEarnings = totalEarnings;

            transaction.update(targetUserDocRef, {
              unclaimedCoins: admin.firestore.FieldValue.increment(totalEarnings),
              miningStartTime: null,
              sessionEndTime: null,
              sessionBaseEarnings: 0,
              sessionReferralEarnings: 0,
              sessionMissedCoinEarnings: 0, // Reset this field
              kuberBlocks: [],
            });
        });

        return { success: true, earnings: sessionEarnings };
    } catch (error) {
        console.error("Error in finalizeSession function:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError(
          "internal",
          "An error occurred while finalizing the session.",
        );
    }
});

export const claimMinedCoins = functions.runWith({ timeoutSeconds: 30 }).https.onCall(async (data, context) => {
  // 1. Check for authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const uid = context.auth.uid;
  const userDocRef = db.collection("users").doc(uid);

  try {
    let claimedAmount = 0;

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "User document does not exist.",
        );
      }

      const profile = userDoc.data();
      const unclaimed = profile?.unclaimedCoins || 0;

      if (unclaimed <= 0) {
        // Nothing to claim, but not an error.
        claimedAmount = 0;
        return;
      }
      
      claimedAmount = unclaimed;

      // Prepare the update payload
      const updatePayload: { [key: string]: any } = {
        minedCoins: admin.firestore.FieldValue.increment(unclaimed),
        unclaimedCoins: 0,
        activeBoosts: [],
        spinWinnings: 0,
        spinAdWatchCount: 0,
        adWatchHistory: [],
        sessionBaseEarnings: 0,
        sessionReferralEarnings: 0,
        sessionMissedCoinEarnings: 0, // Reset this field
        kuberBlocks: [],
      };
      
      if (!profile?.adsUnlocked) {
        updatePayload.adsUnlocked = true;
      }

      transaction.update(userDocRef, updatePayload);
    });

    return { success: true, claimedAmount: claimedAmount };

  } catch (error) {
    console.error("Error in claimMinedCoins function:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while claiming coins.",
    );
  }
});


export const claimDailyCoin = functions.runWith({ timeoutSeconds: 30 }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
    }

    const uid = context.auth.uid;
    const { coinId, isMissed, adElement } = data;

    if (!coinId) {
        throw new functions.https.HttpsError("invalid-argument", "The function must be called with a 'coinId' argument.");
    }

    const userDocRef = db.collection("users").doc(uid);

    try {
        const claimedAmount = 1; // Each coin is worth 1

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User document does not exist.");
            }

            const profile = userDoc.data() as UserProfile;
            // Explicitly handle cases where dailyClaimedCoins might not exist for older users
            const claimedCoins: string[] = Array.isArray(profile.dailyClaimedCoins) ? profile.dailyClaimedCoins : [];

            if (claimedCoins.includes(coinId)) {
                throw new functions.https.HttpsError("failed-precondition", "This coin has already been collected.");
            }

            claimedCoins.push(coinId);
            
            // Keep only the last 8
            while (claimedCoins.length > 8) {
                claimedCoins.shift(); // Remove the oldest
            }

            const updatePayload: { [key: string]: any } = {
                dailyClaimedCoins: claimedCoins,
                minedCoins: admin.firestore.FieldValue.increment(claimedAmount)
            };
            
            if (isMissed) {
                const adEvent = {
                    id: db.collection('temp').doc().id, // Generate ID on server
                    element: adElement || `Missed Coin ${coinId}`,
                    timestamp: Date.now(),
                };
                updatePayload.adWatchHistory = admin.firestore.FieldValue.arrayUnion(adEvent);
                updatePayload.lastMissedCoinClaimTimestamp = Date.now();
            }

            transaction.update(userDocRef, updatePayload);
        });

        return { success: true, claimedAmount };

    } catch (error) {
        console.error("Error in claimDailyCoin function:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError(
            "internal",
            "An error occurred while claiming the coin.",
        );
    }
});

export const sendVerificationEmail = functions.https.onCall(async (data, context) => {
    const { email } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "email" argument.');
    }

    try {
        const link = await admin.auth().generateEmailVerificationLink(email);
        // Note: You would typically send this link via a transactional email service like SendGrid, Mailgun, etc.
        // For this example, we are logging it, but in a real app, you would not do this.
        console.log(`Verification link for ${email}: ${link}`);
        // In a real app, you would return success and the client would show a "email sent" message.
        return { success: true };
    } catch (error) {
        console.error('Error generating email verification link:', error);
        throw new functions.https.HttpsError('internal', 'Unable to generate verification link.');
    }
});

export const enrollUsersInTournament = functions.runWith({ timeoutSeconds: 60 }).https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const adminUid = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminUid).get();
    
    const isSuperAdmin = adminUid === 'obaW90LhdhPDvbvh06wWwBfucTk1' || adminUid === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
    const isAdminByField = adminDoc.exists && adminDoc.data()?.isAdmin === true;

    if (!isSuperAdmin && !isAdminByField) {
         throw new functions.https.HttpsError("permission-denied", "User must be an admin.");
    }

    const { userIds } = data;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "An array of user IDs must be provided.");
    }
    
    try {
        const tournamentConfigRef = db.collection('config').doc('tournament');
        const tournamentDoc = await tournamentConfigRef.get();

        if (!tournamentDoc.exists || !tournamentDoc.data()?.isActive) {
            throw new functions.https.HttpsError("failed-precondition", "There is no active tournament.");
        }
        const tournamentId = tournamentDoc.id;
        const now = admin.firestore.Timestamp.now();

        const batch = db.batch();
        userIds.forEach(userId => {
            const userRef = db.collection('users').doc(userId);
            batch.update(userRef, {
                tournamentId: tournamentId,
                tournamentScore: 0,
                tournamentScoreLastUpdated: now,
            });
        });

        await batch.commit();
        return { success: true, message: `Enrolled ${userIds.length} users.` };
    } catch (error: any) {
        console.error("Error in enrollUsersInTournament:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while enrolling users.");
    }
});

export const unenrollAllUsersFromTournament = functions.runWith({ timeoutSeconds: 120 }).https.onCall(async (data, context) => {
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
    }

    const adminUid = context.auth.uid;
    const adminDoc = await db.collection('users').doc(adminUid).get();

    const isSuperAdmin = adminUid === 'obaW90LhdhPDvbvh06wWwBfucTk1' || adminUid === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
    const isAdminByField = adminDoc.exists && adminDoc.data()?.isAdmin === true;
    
    if (!isSuperAdmin && !isAdminByField) {
         throw new functions.https.HttpsError("permission-denied", "User must be an admin.");
    }

    try {
        const tournamentConfigRef = db.collection('config').doc('tournament');
        const tournamentDoc = await tournamentConfigRef.get();

        if (!tournamentDoc.exists) {
             // No tournament exists, so nothing to do.
            return { success: true, message: "No active tournament found to unenroll users from." };
        }
        const tournamentId = tournamentDoc.id;

        const usersQuery = db.collection('users').where('tournamentId', '==', tournamentId);
        const usersSnapshot = await usersQuery.get();

        if (usersSnapshot.empty) {
            return { success: true, message: "No users were enrolled in the tournament." };
        }

        const batch = db.batch();
        usersSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                tournamentId: null,
                tournamentScore: 0,
                tournamentScoreLastUpdated: null,
            });
        });
        await batch.commit();

        return { success: true, message: `Unenrolled ${usersSnapshot.size} users.` };

    } catch (error: any) {
        console.error("Error in unenrollAllUsersFromTournament:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while unenrolling users.");
    }
});


    

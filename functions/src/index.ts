
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { UserProfile } from "./types";

admin.initializeApp();
const db = admin.firestore();

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

        // 1. Get referee document
        const refereeDocRef = usersRef.doc(refereeUid);
        const refereeDoc = await transaction.get(refereeDocRef);
        if (!refereeDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Your user profile was not found.");
        }
        const refereeData = refereeDoc.data() as UserProfile;

        if (refereeData.referredBy) {
          throw new functions.https.HttpsError("failed-precondition", "You have already applied a referral code.");
        }

        // 2. Get referrer document
        const referrerQuery = usersRef.where("profileCode", "==", referrerCode.toUpperCase());
        const referrerSnapshot = await transaction.get(referrerQuery);
        if (referrerSnapshot.empty) {
          throw new functions.https.HttpsError("not-found", "The referral code you entered is not valid.");
        }
        const referrerDoc = referrerSnapshot.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data() as UserProfile;

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

        // 4. Update Referee's Document
        transaction.update(refereeDocRef, {
            referredBy: referrerId,
            referredByName: referrerData.fullName,
            referralAppliedAt: admin.firestore.FieldValue.serverTimestamp(),
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
            appliedCodeBoost: 0.25,
        });

        // 5. Update Referrer's Document
        const promoterRewardEntry = {
            referralId: refereeUid,
            referralName: refereeData.fullName,
            referralProfileCode: refereeData.profileCode,
            usdtAmount: 0.15,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        transaction.update(referrerDoc.ref, {
            referrals: admin.firestore.FieldValue.arrayUnion(refereeUid),
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
            promoterRewards: admin.firestore.FieldValue.arrayUnion(promoterRewardEntry),
            promoterReferralCount: admin.firestore.FieldValue.increment(1),
        });

        // 6. Update Second-Level Referrer's Document
        if (referrerData.referredBy) {
            const secondLevelReferrerId = referrerData.referredBy;
            const secondLevelReferrerDocRef = usersRef.doc(secondLevelReferrerId);
        
            const secondLevelReferrerDoc = await transaction.get(secondLevelReferrerDocRef);
            if (secondLevelReferrerDoc.exists) {
                const secondLevelData = secondLevelReferrerDoc.data() as UserProfile;
                const currentRewards = secondLevelData.secondLevelPromoterRewards || {};
                
                const existingReward = currentRewards[referrerId] || { usdtAmount: 0 };
                
                const updatedReward = {
                    directReferralName: referrerData.fullName,
                    usdtAmount: existingReward.usdtAmount + 0.05,
                };
        
                transaction.update(secondLevelReferrerDocRef, {
                    secondLevelPromoterRewards: {
                        ...currentRewards,
                        [referrerId]: updatedReward
                    }
                });
            }
        }
      });

      return { success: true, message: `Success! You and ${referrerCode} both received ${10} BLIT.` };

    } catch (error: any) {
        console.error("Error in applyReferralCode Cloud Function:", error);
        // Re-throw HttpsError to be caught by the client
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        // Throw a generic internal error for other cases
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
            const isSuperAdmin = callerUid === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
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


import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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
              sessionMissedCoinEarnings: 0, // Reset field
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

export const claimMinedCoins = functions.https.onCall(async (data, context) => {
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


export const claimDailyCoin = functions.https.onCall(async (data, context) => {
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
        let claimedAmount = 0;

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User document does not exist.");
            }

            const profile = userDoc.data();
            if (!profile) {
                throw new functions.https.HttpsError("internal", "User profile is missing.");
            }

            const dailyCoins = profile.dailyAdCoins || [];
            const coinIndex = dailyCoins.findIndex((c: any) => c.id === coinId);

            if (coinIndex === -1) {
                throw new functions.https.HttpsError("not-found", "The specified coin does not exist.");
            }

            const coin = dailyCoins[coinIndex];
            
            if (isMissed) {
                if (coin.status !== 'missed') {
                    throw new functions.https.HttpsError("failed-precondition", "This coin is not in a 'missed' state.");
                }
                 if (!profile.adsUnlocked) {
                    throw new functions.https.HttpsError("failed-precondition", "Ads are not unlocked for this user.");
                }
            } else {
                if (coin.status !== 'available') {
                     throw new functions.https.HttpsError("failed-precondition", "This coin is not currently available to collect.");
                }
            }
            
            claimedAmount = 1; // Assuming each coin is worth 1
            dailyCoins[coinIndex] = {
                ...coin,
                status: 'collected',
                collectedFromStatus: isMissed ? 'missed' : 'available',
                collectedAt: Date.now(),
            };

            const isSessionActive = profile.sessionEndTime && Date.now() < profile.sessionEndTime;

            const updatePayload: { [key: string]: any } = {
                dailyAdCoins: dailyCoins,
            };

            if (isSessionActive) {
                updatePayload.sessionBaseEarnings = admin.firestore.FieldValue.increment(claimedAmount);
            } else {
                updatePayload.minedCoins = admin.firestore.FieldValue.increment(claimedAmount);
            }
            
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

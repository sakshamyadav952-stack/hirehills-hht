
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
    const config = data as Partial<TournamentConfig>;

    try {
        const currentConfigDoc = await db.doc('config/tournament').get();
        
        if (currentConfigDoc.exists) {
            const currentConfig = currentConfigDoc.data() as TournamentConfig;
            const isStoppingTournament = currentConfig.isActive && config.isActive === false;
            
            if (isStoppingTournament) {
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
                    startDate: currentConfig.startDate,
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
                
                batch.update(configDocRef, { isActive: false });
                
                winners.forEach(winner => {
                    const userDocRef = db.collection('users').doc(winner.userId);
                    batch.update(userDocRef, {
                        tournamentWinning: admin.firestore.FieldValue.increment(winner.prize)
                    });
                });

                await batch.commit();
                return { success: true, message: 'Tournament Stopped. Winner data has been saved.' };

            } else {
                let endDate: Date | null = null;
                if (config.endDate) {
                    endDate = config.endDate instanceof admin.firestore.Timestamp ? config.endDate.toDate() : new Date(config.endDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                 const dataToUpdate:Partial<TournamentConfig> = {
                    ...config,
                    ...(endDate && { endDate: admin.firestore.Timestamp.fromDate(endDate) })
                };

                const isLaunching = !currentConfig.isActive && config.isActive === true;
                if (isLaunching) {
                    dataToUpdate.startDate = admin.firestore.Timestamp.now();
                }

                await configDocRef.set(dataToUpdate, { merge: true });
                return { success: true, message: 'Tournament configuration has been saved.' };
            }
        } else {
            let endDate: Date | null = null;
            if (config.endDate) {
                endDate = config.endDate instanceof admin.firestore.Timestamp ? config.endDate.toDate() : new Date(config.endDate);
                endDate.setHours(23, 59, 59, 999);
            }
             const dataToUpdate:Partial<TournamentConfig> = {
                ...config,
                ...(endDate && { endDate: admin.firestore.Timestamp.fromDate(endDate) })
            };
            if (config.isActive) {
                dataToUpdate.startDate = admin.firestore.Timestamp.now();
            }
            await configDocRef.set(dataToUpdate, { merge: true });
            return { success: true, message: 'Tournament configuration has been saved.' };
        }

    } catch (error: any) {
        console.error("Error updating tournament config:", error);
        throw new functions.https.HttpsError("internal", "Could not save tournament configuration.", error.message);
    }
});


export const applyReferralCode = functions
  .runWith({ timeoutSeconds: 30 })
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
        const now = admin.firestore.Timestamp.now();

        const refereeDocRef = usersRef.doc(refereeUid);
        const refereeDoc = await transaction.get(refereeDocRef);

        const referrerQuery = usersRef.where("profileCode", "==", referrerCode.toUpperCase());
        const referrerSnapshot = await transaction.get(referrerQuery);
        
        if (referrerSnapshot.empty) {
          throw new functions.https.HttpsError("not-found", "The referral code you entered is not valid.");
        }
        const referrerDoc = referrerSnapshot.docs[0];
        const referrerId = referrerDoc.id;
        const referrerData = referrerDoc.data() as UserProfile;
        
        let secondLevelReferrerDoc = null;
        if (referrerData.isPromoter === true && referrerData.referredBy) {
            const secondLevelReferrerDocRef = usersRef.doc(referrerData.referredBy);
            secondLevelReferrerDoc = await transaction.get(secondLevelReferrerDocRef);
        }

        let tournamentDoc = null;
        if (referrerData.tournamentId) {
            const tournamentDocRef = db.collection('config').doc('tournament');
            tournamentDoc = await transaction.get(tournamentDocRef);
        }

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

        const rewardAmount = 10;
        
        transaction.update(refereeDocRef, {
            referredBy: referrerId,
            referredByName: referrerData.fullName,
            referralAppliedAt: now,
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
            appliedCodeBoost: 0.25,
        });

        const referrerUpdateData: { [key: string]: any } = {
            referrals: admin.firestore.FieldValue.arrayUnion(refereeUid),
            minedCoins: admin.firestore.FieldValue.increment(rewardAmount),
        };

        if (tournamentDoc && tournamentDoc.exists) {
            const tournamentData = tournamentDoc.data();
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

      return { success: true, message: `Success! You and ${referrerCode} both received ${10} HOT.` };

    } catch (error: any) {
        console.error("Error in applyReferralCode Cloud Function:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError("internal", "An unexpected error occurred while applying the code. Please try again.");
    }
  });


export const claimMinedCoins = functions.runWith({ timeoutSeconds: 30 }).https.onCall(async (data, context) => {
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
        claimedAmount = 0;
        return;
      }
      
      claimedAmount = unclaimed;

      const updatePayload: { [key: string]: any } = {
        minedCoins: admin.firestore.FieldValue.increment(unclaimed),
        unclaimedCoins: 0,
        activeBoosts: [],
        spinWinnings: 0,
        spinAdWatchCount: 0,
        adWatchHistory: [],
        sessionBaseEarnings: 0,
        sessionReferralEarnings: 0,
        sessionMissedCoinEarnings: 0,
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
      "An error occurred while claiming tokens.",
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
        const claimedAmount = 1;

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User document does not exist.");
            }

            const profile = userDoc.data() as UserProfile;
            const claimedCoins: string[] = Array.isArray(profile.dailyClaimedCoins) ? profile.dailyClaimedCoins : [];

            if (claimedCoins.includes(coinId)) {
                throw new functions.https.HttpsError("failed-precondition", "This coin has already been collected.");
            }

            claimedCoins.push(coinId);
            
            while (claimedCoins.length > 8) {
                claimedCoins.shift();
            }

            const updatePayload: { [key: string]: any } = {
                dailyClaimedCoins: claimedCoins,
                minedCoins: admin.firestore.FieldValue.increment(claimedAmount)
            };
            
            if (isMissed) {
                const adEvent = {
                    id: db.collection('temp').doc().id,
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
            "An error occurred while claiming the token.",
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
        console.log(`Verification link for ${email}: ${link}`);
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

export const leaveTournament = functions.runWith({ timeoutSeconds: 30 }).https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
    }
    const uid = context.auth.uid;
    const userDocRef = db.collection("users").doc(uid);

    try {
        await userDocRef.update({
            tournamentId: 'left',
            tournamentScore: -1
        });
        return { success: true, message: "You have left the league." };
    } catch (error) {
        console.error("Error leaving tournament:", error);
        throw new functions.https.HttpsError("internal", "Could not leave the league.");
    }
});

export const adminRejoinTournament = functions.runWith({ timeoutSeconds: 30 }).https.onCall(async (data, context) => {
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

    const { userId } = data;
    if (!userId || typeof userId !== 'string') {
        throw new functions.https.HttpsError("invalid-argument", "A valid user ID must be provided.");
    }

    const userDocRef = db.collection('users').doc(userId);
    try {
        await userDocRef.update({
            tournamentId: null,
            tournamentScore: 0,
            tournamentScoreLastUpdated: null
        });
        return { success: true, message: "User is now eligible to rejoin the league." };
    } catch (error) {
        console.error("Error rejoining user:", error);
        throw new functions.https.HttpsError("internal", "Could not process the rejoin request.");
    }
});

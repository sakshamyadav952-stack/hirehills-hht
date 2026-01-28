import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

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

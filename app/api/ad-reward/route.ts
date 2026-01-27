
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// IMPORTANT: In a production environment, these should be stored securely as environment variables.
// You would need to create a service account in your Firebase project and download the JSON key file.
// For example: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
const serviceAccount = {
  // Your service account key JSON would go here.
  // This is left empty for security reasons. You will need to populate this.
};

let db: any;

try {
  // Initialize Firebase Admin SDK
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  db = getFirestore();
} catch (e: any) {
  if (e.code !== 'app/invalid-credential') {
    console.error("Firebase Admin SDK initialization failed:", e);
  } else {
    console.warn("Firebase Admin SDK not initialized. Service account key is missing or invalid. Ad rewards will not be processed on the server.");
  }
}


/**
 * Handles GET requests for URL verification from AdMob.
 * AdMob sends a GET request to verify the endpoint exists before sending POST callbacks.
 */
export async function GET(request: NextRequest) {
  // Simply respond with a 200 OK to confirm the URL is active.
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}


/**
 * This is a placeholder for the AdMob public key fetching and verification logic.
 * In a real-world scenario, you would fetch the public keys from Google
 * and use a cryptography library to verify the signature from the request.
 *
 * AdMob public keys can be found here: https://www.gstatic.com/admob/reward/verifier-keys.json
 */
async function verifyAdMobRequest(request: NextRequest): Promise<boolean> {
  // The 'signature' and 'key_id' are expected as query parameters.
  const signature = request.nextUrl.searchParams.get('signature');
  const keyId = request.nextUrl.searchParams.get('key_id');

  if (!signature || !keyId) {
    console.error('Missing signature or key_id in AdMob callback');
    return false;
  }

  // --- Placeholder for verification logic ---
  // 1. Fetch the public keys from Google's endpoint.
  // 2. Find the key that matches the `key_id` from the request.
  // 3. Construct the message to verify. This is the entire request URL without the 'signature' and 'key_id' params.
  // 4. Use a crypto library (like Node's `crypto`) to verify the signature using the public key.
  //
  // For now, we will return true for demonstration purposes.
  // Replace this with actual verification in production.
  console.warn('AdMob signature verification is currently bypassed. DO NOT use in production.');
  return true;
}


export async function POST(request: NextRequest) {
  // If the admin SDK failed to initialize, do not process rewards.
  if (!db) {
    return NextResponse.json({ status: 'error', message: 'Server is not configured to process rewards.' }, { status: 503 });
  }

  try {
    // --- 1. Verify the request is from AdMob ---
    const isVerified = await verifyAdMobRequest(request);
    if (!isVerified) {
      return NextResponse.json({ status: 'error', message: 'Request verification failed.' }, { status: 403 });
    }

    // --- 2. Extract User ID ---
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({ status: 'error', message: 'User ID is missing.' }, { status: 400 });
    }

    // --- 3. Add a notification to the user's document ---
    const userDocRef = db.collection('users').doc(userId);

    // The reward is already given on the client. Here, we just add a notification.
    await userDocRef.update({
      notifications: FieldValue.arrayUnion("Your ad reward has been credited!")
    });

    console.log(`Ad-watched notification sent to user ${userId}.`);

    // --- 4. Respond to AdMob ---
    // Respond with a 200 OK to acknowledge receipt of the callback.
    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    console.error('Error in AdMob S2S callback:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'An internal error occurred.' }, { status: 500 });
  }
}

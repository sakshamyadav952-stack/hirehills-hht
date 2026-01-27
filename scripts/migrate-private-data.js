/**
 * Safe Firestore User Private Data Migration
 * Moves email & mobileNumber to /users/{uid}/private/contact
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const BATCH_LIMIT = 400; // < 500 (safe margin)

async function migrateUsers() {
  console.log('🚀 Starting safe migration...');

  const usersSnap = await db.collection('users').get();
  if (usersSnap.empty) {
    console.log('No users found.');
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  let migrated = 0;

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    const uid = doc.id;

    // Skip already migrated users
    if (user.migratedToPrivate === true) continue;

    if (!user.email && !user.mobileNumber) continue;

    const privateRef = doc.ref
      .collection('private')
      .doc('contact');

    // 1️⃣ Save private data
    batch.set(
      privateRef,
      {
        email: user.email || null,
        mobileNumber: user.mobileNumber || null,
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    // 2️⃣ Clean public document AFTER save
    batch.update(doc.ref, {
      email: admin.firestore.FieldValue.delete(),
      mobileNumber: admin.firestore.FieldValue.delete(),
      migratedToPrivate: true
    });

    batchCount += 2;
    migrated++;

    // Commit safely
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`✅ Committed batch (${migrated} users so far)`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  // Commit remaining
  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`🎉 Migration complete. Total users migrated: ${migrated}`);
}

migrateUsers().catch(err => {
  console.error('❌ Migration failed:', err);
});

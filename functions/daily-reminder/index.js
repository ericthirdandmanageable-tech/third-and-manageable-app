/**
 * Daily Reminder Cloud Function
 *
 * This can be deployed as a Firebase Cloud Function (scheduled)
 * or as a standalone Node.js script triggered by any CRON scheduler.
 *
 * Queries push_tokens collection from Firebase Firestore and sends
 * Expo push notifications to all registered users.
 *
 * Schedule: Daily at 9:00 AM UTC
 *
 * Environment Variables:
 *   FIREBASE_PROJECT_ID — your Firebase project ID
 *   FIREBASE_CLIENT_EMAIL — service account email
 *   FIREBASE_PRIVATE_KEY — service account private key (JSON-escaped)
 *
 * If using Firebase Cloud Functions, these are auto-configured.
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin (handles both Cloud Functions and standalone)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Fallback: use default credentials (works in Cloud Functions)
    admin.initializeApp();
  }
}

const db = admin.firestore();

/**
 * Main function: fetch push tokens and send daily reminders.
 * Can be called from Firebase Cloud Functions scheduler, Appwrite Functions,
 * or any CRON-based system.
 */
async function sendDailyReminders() {
  try {
    // Fetch all push tokens from Firestore
    const tokenSnapshot = await db
      .collection("push_tokens")
      .limit(500)
      .get();

    if (tokenSnapshot.empty) {
      console.log("No push tokens found. Skipping.");
      return { success: true, sent: 0 };
    }

    const tokens = tokenSnapshot.docs.map((doc) => doc.data().token);
    console.log(`Found ${tokens.length} push tokens.`);

    // Send via Expo Push API (batch up to 100 at a time)
    const batchSize = 100;
    let totalSent = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const messages = batch.map((token) => ({
        to: token,
        title: "Time to Check In",
        body: "Take a moment to reflect on your day. Your journey matters.",
        data: { screen: "check-in" },
        sound: "default",
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log(
        `Batch ${Math.floor(i / batchSize) + 1}: ${result.data?.length || 0} sent`,
      );
      totalSent += batch.length;
    }

    console.log(`Daily reminder sent to ${totalSent} devices.`);
    return { success: true, sent: totalSent };
  } catch (err) {
    console.error(`Daily reminder failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─── Export for different runtimes ────────────────────────────────────

// For Appwrite Functions
module.exports = async ({ req, res, log, error }) => {
  const result = await sendDailyReminders();
  if (result.success) {
    log?.(`Daily reminder sent to ${result.sent} devices.`);
    return res.json(result);
  } else {
    error?.(`Daily reminder failed: ${result.error}`);
    return res.json(result, 500);
  }
};

// Also export the function directly for Firebase Cloud Functions usage
module.exports.sendDailyReminders = sendDailyReminders;

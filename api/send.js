import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    let serviceAccount;
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!rawServiceAccount) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is missing");
    }

    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch (e) {
      // Newlines aur escaped characters ko clean karne ke liye
      const formatted = rawServiceAccount.replace(/\\n/g, '\n');
      serviceAccount = JSON.parse(formatted);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM Token is required' });
    }

    const message = {
      token: token,
      notification: {
        title: title || 'Test Title',
        body: body || 'Test Body',
      },
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

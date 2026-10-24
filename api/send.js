import admin from 'firebase-admin';

let initError = null;

if (!admin.apps.length) {
  try {
    let rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!rawEnv) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
    }

    let serviceAccount = JSON.parse(rawEnv);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    initError = error.message;
    console.error("Firebase initialization failed:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Agar initialization fail hui hai, toh exact error turant return karo
  if (initError) {
    return res.status(500).json({ error: `Initialization Failed: ${initError}` });
  }

  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM Token is required' });
    }

    const message = {
      token: token,
      notification: {
        title: title || 'PRinceApp Test',
        body: body || 'Notification working successfully!',
      },
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

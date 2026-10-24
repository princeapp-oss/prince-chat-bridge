import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    let serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountEnv) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
    }

    let serviceAccount;
    try {
      // Pehle normal JSON parse karke dekhte hain
      serviceAccount = JSON.parse(serviceAccountEnv);
    } catch (e) {
      // Agar raw newlines ya formatting ki wajah se error aaye, toh unhe safely escape karke parse karo
      const sanitized = serviceAccountEnv
        .replace(/\r?\n/g, '\\n')
        .replace(/\t/g, '\\t');
      serviceAccount = JSON.parse(sanitized);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
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

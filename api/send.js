import admin from 'firebase-admin';

let initError = null;
let debugInfo = {};

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let rawKey = process.env.FIREBASE_PRIVATE_KEY;

    let missing = [];
    if (!projectId) missing.push('PROJECT_ID');
    if (!clientEmail) missing.push('CLIENT_EMAIL');
    if (!rawKey) missing.push('PRIVATE_KEY');

    if (missing.length > 0) {
      throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }

    let privateKey = rawKey.trim().replace(/^["']|["']$/g, '');

    try {
      const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{') || decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = decoded;
      }
    } catch (e) {}

    if (privateKey.trim().startsWith('{')) {
      try {
        const serviceAccount = JSON.parse(privateKey);
        privateKey = serviceAccount.private_key;
      } catch (e) {
        throw new Error("Failed to parse JSON from Base64 string.");
      }
    }

    privateKey = privateKey.replace(/\\n/g, '\n').trim().replace(/^["']|["']$/g, '');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    initError = `${error.message}`;
    console.error("Firebase initialization failed:", error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (initError) {
    return res.status(500).json({ error: initError });
  }

  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM Token is required' });
    }

    // 👇 DATA PAYLOAD (Ye Vivo par 100% chalega kyunki ye onMessageReceived ko trigger karega)
    const message = {
      token: token,
      data: {
        title: title || 'PRinceApp Test',
        body: body || 'Notification working successfully!',
      },
      android: {
        priority: 'high',
      },
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

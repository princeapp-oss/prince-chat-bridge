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

    // 1. Try Base64 decoding
    try {
      const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{') || decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        privateKey = decoded;
      }
    } catch (e) {
      // Keep original if not base64
    }

    // 2. If it's a JSON service account object
    if (privateKey.trim().startsWith('{')) {
      try {
        const serviceAccount = JSON.parse(privateKey);
        privateKey = serviceAccount.private_key;
      } catch (e) {
        throw new Error("Failed to parse JSON from Base64 string.");
      }
    }

    // 3. Fix escaped newlines (\n) to actual newline characters
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Clean any surrounding quotes
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');

    debugInfo = {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      keyLength: privateKey.length,
      hasBeginHeader: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      hasEndHeader: privateKey.includes('-----END PRIVATE KEY-----')
    };

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error("Private key missing valid PEM headers after processing.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    initError = `${error.message} | Debug: ${JSON.stringify(debugInfo)}`;
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

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

    // Clean surrounding quotes or whitespace
    let privateKey = rawKey.trim().replace(/^["']|["']$/g, '');

    // Try decoding Base64 if it's encoded
    try {
      const decoded = Buffer.from(privateKey, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----') || decoded.trim().startsWith('{')) {
        privateKey = decoded;
      }
    } catch (e) {
      // If not base64, keep original string
    }

    // If it's the full service account JSON object
    if (privateKey.trim().startsWith('{')) {
      try {
        const serviceAccount = JSON.parse(privateKey);
        privateKey = serviceAccount.private_key;
      } catch (e) {
        throw new Error("Failed to parse JSON service account from private key env var.");
      }
    }

    // Fix escaped newlines (\n) to actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    privateKey = privateKey.trim();

    debugInfo = {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      keyLength: privateKey.length,
      startsWithHeader: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsWithHeader: privateKey.endsWith('-----END PRIVATE KEY-----')
    };

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error("Private key missing valid PEM header after processing.");
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

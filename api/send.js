import admin from 'firebase-admin';

let initError = null;
let debugInfo = {};

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    debugInfo = {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      keyLength: privateKey ? privateKey.length : 0
    };

    let missing = [];
    if (!projectId) missing.push('PROJECT_ID');
    if (!clientEmail) missing.push('CLIENT_EMAIL');
    if (!privateKey) missing.push('PRIVATE_KEY');

    if (missing.length > 0) {
      throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }

    // --- FOOLPROOF PRIVATE KEY REBUILDER ---
    privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Headers, footers aur saare extra spaces/broken newlines hata kar sirf base64 data nikalo
    const base64Clean = privateKey
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/[\r\n\s]+/g, '');

    // Ab us base64 data ko bilkul saaf 64-characters ke chunks mein fir se build karo
    const chunks = [];
    for (let i = 0; i < base64Clean.length; i += 64) {
      chunks.push(base64Clean.substring(i, i + 64));
    }

    privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----`;
    // ---------------------------------------

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

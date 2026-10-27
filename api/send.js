import admin from 'firebase-admin';

let initError = null;

if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let rawKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !rawKey) {
      throw new Error("Missing Firebase environment variables.");
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
    initError = error.message;
    console.error("Firebase init failed:", error);
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
    // 🟢 Vercel Node.js Stream Body Parser (Fixes 400 Error)
    let requestBody = req.body;
    if (!requestBody || typeof requestBody !== 'object') {
      requestBody = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch (e) {
            resolve({});
          }
        });
        req.on('error', () => resolve({}));
      });
    }

    const { recipientUid, title, body } = requestBody;

    if (!recipientUid) {
      return res.status(400).json({ error: 'Recipient UID is required' });
    }

    // Firestore se recipient ka fcmToken nikalenge
    const userDoc = await admin.firestore().collection('users').doc(recipientUid).get();
    
    if (!userDoc.exists || !userDoc.data().fcmToken) {
      return res.status(404).json({ error: 'Recipient FCM Token not found in Firestore' });
    }


const userData = userDoc.data();
const recipientToken = userData.fcmToken || userData.token;
    

    const message = {
      token: recipientToken,
      notification: {
        title: title || 'New Message',
        body: body || 'You have a new message',
      },
      data: {
        title: title || 'New Message',
        body: body || 'You have a new message',
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

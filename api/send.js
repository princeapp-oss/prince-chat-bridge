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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (initError) {
    return res.status(500).json({ error: initError });
  }

  try {
    // 🟢 Foolproof Body Parser for Vercel
    let requestBody = req.body;
    if (!requestBody || typeof requestBody !== 'object' || Object.keys(requestBody).length === 0) {
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

    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
      } catch (e) {
        requestBody = {};
      }
    }

    const recipientUid = requestBody.recipientUid;
    const title = requestBody.title;
    const body = requestBody.body;
    const senderId = requestBody.senderId;

    if (!recipientUid) {
      return res.status(400).json({ error: 'Recipient UID is required', received: requestBody });
    }

    const userDoc = await admin.firestore().collection('users').doc(recipientUid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Recipient user not found in Firestore' });
    }

    const userData = userDoc.data();
    const recipientToken = userData.fcmToken || userData.token;

    if (!recipientToken) {
      return res.status(404).json({ error: 'Recipient FCM Token not found in Firestore' });
    }

    const message = {
      token: recipientToken,
      notification: {
        title: title || 'PRince Chat',
        body: body || 'You have a new message',
      },
      data: {
        title: title || 'PRince Chat',
        body: body || 'You have a new message',
        senderId: String(senderId || '')
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'prince_chat_notifications'
        }
      },
    };

    const response = await admin.messaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    console.error("FCM Send Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

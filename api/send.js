const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
        // Agar key ke andar literal \n string hai toh use real newline mein convert karo
        if (privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
    } catch (e) {
        console.error('Firebase initialization error details:', e.message);
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!admin.apps.length) {
            throw new Error("Firebase Admin SDK failed to initialize. Check Vercel Environment Variables.");
        }

        const { token, title, body, senderId } = req.body;

        if (!token || !body) {
            return res.status(400).json({ error: 'Missing required fields (token or body)' });
        }

        const message = {
            token: String(token),
            notification: {
                title: String(title || "PRince Chat"),
                body: String(body)
            },
            data: {
                title: String(title || "PRince Chat"),
                body: String(body),
                senderId: String(senderId || "")
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "prince_chat_notifications"
                }
            }
        };

        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, messageId: response });

    } catch (error) {
        console.error("FCM Send Error:", error.message || error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

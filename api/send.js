const admin = require('firebase-admin');

// Firebase Admin ko initialize karna (agar pehle se nahi hai)
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Private key ki formatting handle karne ke liye
                privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
            })
        });
    } catch (e) {
        console.error('Firebase initialization error:', e);
    }
}

module.exports = async (req, res) => {
    // CORS headers
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
        const { token, title, body, senderId } = req.body;

        if (!token || !body) {
            return res.status(400).json({ error: 'Missing required fields (token or body)' });
        }

        // 🟢 Firebase FCM Message Payload (Data values must be strings!)
        const message = {
            token: token,
            notification: {
                title: String(title || "PRince Chat"),
                body: String(body)
            },
            data: {
                title: String(title || "PRince Chat"),
                body: String(body),
                senderId: String(senderId || "") // 👈 Direct chat opening ke liye
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
        console.error("FCM Send Error:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

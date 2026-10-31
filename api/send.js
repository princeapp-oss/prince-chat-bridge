const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined;

        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            console.error("Missing Firebase Environment Variables on Vercel!");
        } else {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey
                })
            });
        }
    } catch (e) {
        console.error('Firebase init exception:', e.message);
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!admin.apps.length) {
            return res.status(500).json({ error: "Firebase Admin SDK not initialized. Check Vercel Environment Variables setup." });
        }

        const { token, title, body, senderId } = req.body;

        if (!token || !body) {
            return res.status(400).json({ error: 'Missing token or body' });
        }

        const message = {
            token: token,
            notification: {
                title: String(title || "PRince Chat"),
                body: String(body)
            },
            data: {
                senderId: String(senderId || "")
            }
        };

        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, messageId: response });

    } catch (error) {
        console.error("FCM Send Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

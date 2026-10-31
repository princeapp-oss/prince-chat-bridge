const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
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
        const { token, title, body, senderId } = req.body;

        if (!token || !body) {
            return res.status(400).json({ error: 'Missing token or body' });
        }

        // Sabse simple FCM payload jo kabhi fail nahi hota
        const message = {
            token: token,
            notification: {
                title: title || "PRince Chat",
                body: body
            },
            data: {
                senderId: senderId || ""
            }
        };

        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, messageId: response });

    } catch (error) {
        console.error("FCM Error:", error);
        return res.status(500).json({ error: error.message });
    }
};

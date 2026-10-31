const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "YAHAN_APNA_PROJECT_ID_DAALO", 
            clientEmail: "YAHAN_APNI_CLIENT_EMAIL_DAALO", 
            privateKey: "YAHAN_APNI_PRIVATE_KEY_DAALO".replace(/\\n/g, '\n')
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
        console.error("FCM Error:", error.message);
        return res.status(500).json({ error: error.message });
    }
};

const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: "YOUR_PROJECT_ID", // Yahan apna Firebase Project ID daal do
            clientEmail: "YOUR_CLIENT_EMAIL", // Yahan service account ki client email daal do
            privateKey: "YOUR_PRIVATE_KEY".replace(/\\n/g, '\n') // Yahan apni private key daal do
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
        return res.status(200).json({ success: success = true, messageId: response });

    }q catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

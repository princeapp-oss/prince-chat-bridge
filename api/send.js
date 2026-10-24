const admin = require('firebase-admin');

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, title, body } = req.body;

        if (!token || !title || !body) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const message = {
            token: token,
            notification: {
                title: title,
                body: body
            }
        };

        const response = await admin.messaging().send(message);
        return res.status(200).json({ success: true, messageId: response });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

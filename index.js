const express = require('express');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Load Firebase Secret Key from Environment Variable
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./serviceAccountKey.json');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Root route check
app.get('/', (req, res) => {
  res.send('PRinceApp Notification Bridge is Running Live!');
});

// Firestore Listener (using collectionGroup for messages)
db.collectionGroup('messages').onSnapshot((snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const messageData = change.doc.data();
      console.log('New Message Detected:', messageData);

      const receiverId = messageData.receiverId;
      if (!receiverId) return;

      try {
        const userDoc = await db.collection('users').doc(receiverId).get();
        if (userDoc.exists) {
          const fcmToken = userDoc.data().fcmToken;
          if (fcmToken) {
            const payload = {
              notification: {
                title: messageData.senderName || 'New Message',
                body: messageData.message || messageData.text || 'You received a message'
              },
              token: fcmToken
            };
            await admin.messaging().send(payload);
            console.log('Notification sent successfully to:', receiverId);
          } else {
            console.log('No fcmToken found for receiver:', receiverId);
          }
        }
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    }
  });
}, (error) => {
  console.error('Firestore listener error:', error);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bridge listening on port ${PORT}`);
});

const express = require('express');
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.get('/', (req, res) => {
  res.send('PRinceApp Notification Bridge is Running Live!');
});

// Firestore listener for real-time messages
db.collectionGroup("messages").onSnapshot((snapshot) => {
  snapshot.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      const messageData = change.doc.data();
      const receiverId = messageData.receiverId;
      const messageText = messageData.message || messageData.text;
      const senderId = messageData.senderId;

      if (!receiverId || !messageText) return;

      try {
        const userDoc = await db.collection("users").doc(receiverId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
          console.log(`FCM Token not found for user: ${receiverId}`);
          return;
        }

        const payload = {
          token: fcmToken,
          notification: {
            title: `New message from ${senderId}`,
            body: messageText,
          },
          android: {
            notification: {
              channelId: "prince_chat_notifications",
              priority: "high",
              sound: "default"
            },
          },
        };

        await admin.messaging().send(payload);
        console.log(`Notification sent successfully to ${receiverId}`);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Bridge listening on port ' + listener.address().port);
});

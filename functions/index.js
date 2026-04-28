const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');

admin.initializeApp();

exports.sendNotificationPush = onDocumentCreated('users/{userId}/notifications/{notificationId}', async (event) => {
  const notification = event.data && event.data.data();
  if (!notification) return;

  console.log('sendNotificationPush triggered', {
    userId: event.params.userId,
    notificationId: event.params.notificationId,
    notification,
  });

  const userSnap = await admin.firestore().doc(`users/${event.params.userId}`).get();
  const userData = userSnap.data() || {};
  const tokens = Array.from(new Set([
    ...(Array.isArray(userData.fcmTokens) ? userData.fcmTokens : []),
    userData.fcmToken,
  ].filter(Boolean)));

  console.log('tokens found', { tokens });

  if (tokens.length === 0) {
    console.log('no tokens, skipping send');
    return;
  }

  const title = notification.title || 'Hiro';
  const body = notification.message || 'You have a new notification.';
  const url = notification.url || '/messages';

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      url,
      type: notification.type || 'notification',
      roomId: notification.roomId || '',
      notificationId: event.params.notificationId,
    },
    webpush: {
      fcmOptions: {
        link: url,
      },
    },
  });

  console.log('sendEachForMulticast response', response);
});

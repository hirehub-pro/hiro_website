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

  const userRef = admin.firestore().doc(`users/${event.params.userId}`);
  const deviceTokensRef = admin.firestore().collection(`users/${event.params.userId}/deviceTokens`);
  const [userSnap, deviceTokensSnap] = await Promise.all([
    userRef.get(),
    deviceTokensRef.get(),
  ]);

  const userData = userSnap.data() || {};
  const docTokens = [
    ...(Array.isArray(userData.fcmTokens) ? userData.fcmTokens : []),
    userData.fcmToken,
  ].filter(Boolean);

  const subcollectionTokens = deviceTokensSnap.docs
    .map((tokenDoc) => tokenDoc.data()?.token)
    .filter(Boolean);

  const tokens = Array.from(new Set([
    ...docTokens,
    ...subcollectionTokens,
  ]));

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
      notification: {
        title,
        body,
        icon: '/favicon.ico',
      },
    },
    android: {
      priority: 'high',
      notification: {
        title,
        body,
        channelId: 'default',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
          badge: 1,
        },
      },
    },
  });

  console.log('sendEachForMulticast response', response);
});

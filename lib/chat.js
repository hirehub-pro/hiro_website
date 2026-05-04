import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createMessageNotification({
  recipientUserId,
  senderUserId,
  senderName,
  messageId,
  roomId,
  text,
}) {
  if (!recipientUserId || !senderUserId || !roomId) {
    return null;
  }

  const trimmedText = String(text || '').trim();
  const safeSenderName = String(senderName || 'Someone').trim() || 'Someone';

  return addDoc(collection(db, 'users', recipientUserId, 'notifications'), {
    createdAt: serverTimestamp(),
    fromUserId: senderUserId,
    fromUserName: safeSenderName,
    message: trimmedText || `${safeSenderName} sent you a message.`,
    messageId: messageId || '',
    read: false,
    roomId,
    title: safeSenderName,
    type: 'message',
    url: `/messages?roomId=${encodeURIComponent(roomId)}`,
  });
}

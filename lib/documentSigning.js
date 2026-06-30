import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

export async function createDocumentSigningLink(invoiceDocId, receiverId = '') {
  const functions = getFunctions(app, 'us-central1');
  const createRequest = httpsCallable(functions, 'createDocumentSigningRequest');
  const result = await createRequest({
    invoiceDocId,
    ...(receiverId ? { receiverId } : {}),
  });
  const url = result.data?.url;

  if (!url) {
    throw new Error('The signing link could not be created.');
  }

  return {
    url,
    expiresAt: result.data?.expiresAt || '',
  };
}

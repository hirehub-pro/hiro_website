import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export async function sendInvoiceBuilderEmailCode() {
  const callable = httpsCallable(functions, 'sendInvoiceBuilderEmailCode');
  const result = await callable({});
  return result.data;
}

export async function verifyInvoiceBuilderEmailCode(code) {
  const callable = httpsCallable(functions, 'verifyInvoiceBuilderEmailCode');
  const result = await callable({ code });
  return result.data;
}

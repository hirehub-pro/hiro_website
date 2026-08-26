import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

function getCallable(name) {
  return httpsCallable(functions, name);
}

export async function getTaxAuthorityConnectionStatus() {
  const result = await getCallable('getTaxAuthorityConnectionStatus')();
  return result.data || {};
}

export async function createTaxAuthorityAuthorizationUrl() {
  const result = await getCallable('createTaxAuthorityAuthorizationUrl')();
  return result.data || {};
}

export async function requestTaxInvoiceAllocation(payload) {
  const result = await getCallable('requestTaxInvoiceAllocation')(payload);
  return result.data || {};
}

export async function createTaxInvoiceDraft(payload) {
  const result = await getCallable('createTaxInvoiceDraft')(payload);
  return result.data || {};
}

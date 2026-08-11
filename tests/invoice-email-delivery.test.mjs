import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { completeInvoiceSave } from '../lib/invoice-save-workflow.mjs';

const require = createRequire(import.meta.url);
const {
  buildFailedInvoiceEmailUpdate,
  buildInvoiceEmailDeliveries,
  isTerminalInvoiceEmailStatus,
  sendInvoiceEmailDeliveries,
} = require('../../flutter/functions/email_saved_invoice.js');

function baseInvoice(overrides = {}) {
  return {
    invoiceNumber: '305-42',
    docType: 'invoice',
    name: 'Tax Invoice 305-42',
    total: 117,
    clientName: 'Client Name',
    clientEmail: 'client@example.com',
    createdBy: {
      name: 'Owner Name',
      email: 'owner@example.com',
    },
    ...overrides,
  };
}

function successfulSaveOptions(overrides = {}) {
  const persisted = [];
  const options = {
    invoice: baseInvoice(),
    fileName: 'invoice_user-1_42.pdf',
    storagePath: 'invoices/user-1/invoice_user-1_42.pdf',
    requestAllocation: async () => ({ confirmationNumber: 'ALLOC-42' }),
    renderAllocation: async () => {},
    generatePdf: async () => new Blob(['final-pdf'], { type: 'application/pdf' }),
    uploadPdf: async ({ storagePath }) => ({ ref: { fullPath: storagePath } }),
    getDownloadUrl: async () => 'https://storage.example/invoice.pdf',
    persistInvoice: async (payload) => {
      persisted.push(payload);
      return { id: 'invoice_305-42', invoiceDocId: 'invoice_305-42' };
    },
    ...overrides,
  };
  return { options, persisted };
}

test('successful save persists the PDF contract and selects owner and client emails', async () => {
  const { options, persisted } = successfulSaveOptions();
  const saved = await completeInvoiceSave(options);

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].storagePath, options.storagePath);
  assert.equal(persisted[0].url, 'https://storage.example/invoice.pdf');
  assert.equal(persisted[0].fileName, options.fileName);
  assert.equal(saved.invoiceDocId, 'invoice_305-42');
  assert.equal(saved.invoiceNumber, '305-42');
  assert.equal(saved.docType, 'invoice');
  assert.equal(saved.name, 'Tax Invoice 305-42');
  assert.equal(saved.total, 117);
  assert.equal(saved.clientName, 'Client Name');
  assert.equal(saved.clientEmail, 'client@example.com');
  assert.deepEqual(saved.createdBy, {
    name: 'Owner Name',
    email: 'owner@example.com',
  });

  const deliveries = buildInvoiceEmailDeliveries({
    ownerEmail: saved.createdBy.email,
    clientEmail: saved.clientEmail,
    clientName: saved.clientName,
    businessName: saved.createdBy.name,
  });
  assert.deepEqual(deliveries.map(({ type, email }) => ({ type, email })), [
    { type: 'owner', email: 'owner@example.com' },
    { type: 'client', email: 'client@example.com' },
  ]);
});

test('missing client email sends only to the owner', () => {
  const deliveries = buildInvoiceEmailDeliveries({
    ownerEmail: 'owner@example.com',
    clientEmail: '',
    clientName: 'Client',
    businessName: 'Owner Business',
  });
  assert.deepEqual(deliveries.map((delivery) => delivery.type), ['owner']);
});

test('client email equal to owner email does not create a duplicate delivery', () => {
  const deliveries = buildInvoiceEmailDeliveries({
    ownerEmail: 'OWNER@example.com',
    clientEmail: 'owner@example.com',
    clientName: 'Client',
    businessName: 'Owner Business',
  });
  assert.deepEqual(deliveries.map((delivery) => delivery.type), ['owner']);
});

test('repeated Firestore updates cannot reclaim a terminal email delivery', () => {
  for (const status of ['sending', 'sent', 'skipped', 'failed']) {
    assert.equal(isTerminalInvoiceEmailStatus(status), true);
  }
  assert.equal(isTerminalInvoiceEmailStatus(undefined), false);
  assert.equal(isTerminalInvoiceEmailStatus('pending'), false);
});

test('failed PDF upload does not create the Firestore invoice document', async () => {
  let persistCalls = 0;
  const { options } = successfulSaveOptions({
    uploadPdf: async () => {
      throw new Error('Storage upload failed');
    },
    persistInvoice: async () => {
      persistCalls += 1;
      return {};
    },
  });

  await assert.rejects(completeInvoiceSave(options), /Storage upload failed/);
  assert.equal(persistCalls, 0);
});

test('Resend failure is surfaced and produces the preserved failed status fields', async () => {
  const deliveries = buildInvoiceEmailDeliveries({
    ownerEmail: 'owner@example.com',
    clientEmail: 'client@example.com',
    clientName: 'Client',
    businessName: 'Owner Business',
  });
  const resendError = new Error('Resend unavailable');

  await assert.rejects(
    sendInvoiceEmailDeliveries(deliveries, async () => {
      throw resendError;
    }),
    /Resend unavailable/
  );
  assert.deepEqual(buildFailedInvoiceEmailUpdate(resendError), {
    invoiceEmailStatus: 'failed',
    invoiceEmailError: 'Resend unavailable',
  });
});

test('allocation-required save renders allocation before generating and storing the final PDF', async () => {
  const operations = [];
  const { options, persisted } = successfulSaveOptions({
    requiresAllocation: true,
    requestAllocation: async () => {
      operations.push('allocation');
      return { confirmationNumber: 'ALLOC-42' };
    },
    renderAllocation: async () => {
      operations.push('render');
    },
    generatePdf: async () => {
      operations.push('pdf');
      return new Blob(['allocated-pdf'], { type: 'application/pdf' });
    },
    uploadPdf: async ({ storagePath }) => {
      operations.push('upload');
      return { ref: { fullPath: storagePath } };
    },
    getDownloadUrl: async () => {
      operations.push('url');
      return 'https://storage.example/allocated.pdf';
    },
    persistInvoice: async (payload) => {
      operations.push('firestore');
      persisted.push(payload);
      return { id: 'invoice_305-42', invoiceDocId: 'invoice_305-42' };
    },
  });

  await completeInvoiceSave(options);
  assert.deepEqual(operations, [
    'allocation',
    'render',
    'pdf',
    'upload',
    'url',
    'firestore',
  ]);
  assert.equal(persisted[0].allocationNumber, 'ALLOC-42');
  assert.equal(persisted[0].taxAuthorityAllocationNumber, 'ALLOC-42');
});

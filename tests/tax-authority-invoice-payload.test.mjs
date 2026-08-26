import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTaxAuthorityInvoicePayload } from '../lib/taxAuthorityInvoicePayload.js';

const baseInvoice = {
  invoiceNumber: '2026-1024',
  issueDate: '2026-08-26',
  clientId: '123456789',
  clientName: 'Client',
  createdBy: { name: 'Business' },
  vatRate: 18,
  roundTotalEnabled: true,
};

test('allocation totals retain cents when the displayed invoice total is rounded', () => {
  const payload = buildTaxAuthorityInvoicePayload({
    invoice: {
      ...baseInvoice,
      total: 405250,
      lineItems: [{ description: 'Service', quantity: 1, unitPrice: 405250.94, vatMode: 'after_vat' }],
    },
    docType: 'invoice',
    businessId: '987654321',
  });

  assert.equal(payload.invoice.payment_amount, 343433);
  assert.equal(payload.invoice.vat_amount, 61817.94);
  assert.equal(payload.invoice.payment_amount_including_vat, 405250.94);
  assert.equal(payload.invoice.items[0].total_amount, 343433);
  assert.equal(payload.invoice.items[0].vat_amount, 61817.94);
});

test('allocation totals allocate an invoice discount to the line items', () => {
  const payload = buildTaxAuthorityInvoicePayload({
    invoice: {
      ...baseInvoice,
      discountAmount: 15,
      lineItems: [
        { description: 'First', quantity: 1, unitPrice: 100, vatMode: 'before_vat' },
        { description: 'Second', quantity: 1, unitPrice: 50, vatMode: 'before_vat' },
      ],
    },
    docType: 'invoice',
    businessId: '987654321',
  });

  assert.deepEqual(payload.invoice.items.map(({ discount, total_amount, vat_amount }) => ({ discount, total_amount, vat_amount })), [
    { discount: 10, total_amount: 90, vat_amount: 16.2 },
    { discount: 5, total_amount: 45, vat_amount: 8.1 },
  ]);
  assert.equal(payload.invoice.amount_before_discount, 150);
  assert.equal(payload.invoice.discount, 15);
  assert.equal(payload.invoice.payment_amount, 135);
  assert.equal(payload.invoice.vat_amount, 24.3);
  assert.equal(payload.invoice.payment_amount_including_vat, 159.3);
});

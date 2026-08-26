function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function lineSubtotal(item, vatRate) {
  const quantity = Number(item?.quantity) || 0;
  const unitPrice = Number(item?.unitPrice) || 0;
  const amount = quantity * unitPrice;
  const rate = Math.max(Number(vatRate) || 0, 0) / 100;

  return item?.vatMode === 'after_vat' && rate > 0
    ? amount / (1 + rate)
    : amount;
}

// Tax Authority validation derives header totals from these cents. The optional
// rounded UI total must not be used for this authoritative request.
export function buildTaxAuthorityInvoicePayload({ invoice, docType, businessId, accountingSoftwareNumber }) {
  const customerVatNumber = String(invoice?.clientId || '').replace(/\D/g, '');
  const rawSequence = String(invoice?.invoiceNumber || '').match(/(\d+)(?!.*\d)/)?.[1] || '';
  const issueDate = invoice?.issueDate || new Date().toISOString().slice(0, 10);
  const documentNumber = /^\d{4}-\d{4,}$/.test(String(invoice?.invoiceNumber || ''))
    ? String(invoice.invoiceNumber)
    : `${String(issueDate).slice(0, 4)}-${rawSequence.padStart(4, '0')}`;
  const invoiceDocId = `${docType}_${documentNumber}`;
  const vatRate = Math.max(Number(invoice?.vatRate) || 0, 0);
  const sourceItems = Array.isArray(invoice?.lineItems) ? invoice.lineItems : [];
  const itemsBeforeDiscount = sourceItems.map((item) => {
    const quantity = Number(item?.quantity) || 0;
    const pricePerUnit = money(lineSubtotal(item, vatRate) / quantity);
    return {
      item,
      quantity,
      pricePerUnit,
      totalAmount: money(quantity * pricePerUnit),
      vatRate: item?.vatMode === 'no_vat' ? 0 : vatRate,
    };
  });
  const amountBeforeDiscount = money(itemsBeforeDiscount.reduce(
    (total, item) => total + item.totalAmount,
    0
  ));
  const discount = Math.min(Math.max(0, money(invoice?.discountAmount)), amountBeforeDiscount);
  let remainingDiscount = discount;
  const items = itemsBeforeDiscount.map((line, index) => {
    const isLast = index === itemsBeforeDiscount.length - 1;
    const proportionalDiscount = amountBeforeDiscount > 0
      ? money(discount * line.totalAmount / amountBeforeDiscount)
      : 0;
    const lineDiscount = Math.min(line.totalAmount, isLast ? remainingDiscount : proportionalDiscount);
    remainingDiscount = money(remainingDiscount - lineDiscount);
    const totalAmount = money(line.totalAmount - lineDiscount);
    const vatAmount = money(totalAmount * line.vatRate / 100);

    return {
      index: index + 1,
      description: line.item?.description || 'Service',
      quantity: line.quantity,
      price_per_unit: line.pricePerUnit,
      discount: lineDiscount,
      total_amount: totalAmount,
      vat_rate: line.vatRate,
      vat_amount: vatAmount,
    };
  });
  const paymentAmount = money(items.reduce((total, item) => total + item.total_amount, 0));
  const vatAmount = money(items.reduce((total, item) => total + item.vat_amount, 0));

  return {
    invoiceDocId,
    invoice: {
      invoice_id: invoiceDocId,
      invoice_type: 305,
      vat_number: Number(String(businessId || '').replace(/\D/g, '')),
      user_name: invoice?.createdBy?.name || 'Hiro Pro',
      invoice_reference_number: documentNumber,
      customer_vat_number: customerVatNumber ? Number(customerVatNumber) : 0,
      customer_name: invoice?.clientName || '',
      invoice_date: issueDate,
      invoice_issuance_date: issueDate,
      accounting_software_number: Number(accountingSoftwareNumber || 987654321),
      amount_before_discount: amountBeforeDiscount,
      discount,
      payment_amount: paymentAmount,
      vat_amount: vatAmount,
      payment_amount_including_vat: money(paymentAmount + vatAmount),
      invoice_note: invoice?.notes || '',
      action: 0,
      items,
    },
  };
}

export function applyTaxAllocation(invoice, allocation) {
  const confirmationNumber = String(allocation?.confirmationNumber || '').trim();

  return {
    ...invoice,
    taxAuthorityAllocation: allocation,
    allocationNumber: confirmationNumber,
    taxAuthorityAllocationNumber: confirmationNumber,
  };
}

export async function completeInvoiceSave({
  invoice,
  requiresAllocation = false,
  requestAllocation,
  renderAllocation,
  generatePdf,
  uploadPdf,
  getDownloadUrl,
  persistInvoice,
  fileName,
  storagePath,
}) {
  let finalInvoice = invoice;

  if (requiresAllocation) {
    const allocation = await requestAllocation(invoice);
    finalInvoice = applyTaxAllocation(invoice, allocation);
    await renderAllocation(finalInvoice, allocation);
  }

  const pdfBlob = await generatePdf(finalInvoice);
  const uploadedFile = await uploadPdf({ pdfBlob, storagePath });
  const url = await getDownloadUrl(uploadedFile);
  const finalPayload = {
    ...finalInvoice,
    fileName,
    storagePath,
    url,
    savedFileName: fileName,
    savedStoragePath: storagePath,
    savedInvoiceUrl: url,
  };
  const savedRecord = await persistInvoice(finalPayload);

  return {
    ...finalPayload,
    invoiceDocId: savedRecord.invoiceDocId,
    savedFirestoreId: savedRecord.id,
  };
}

const STORAGE_HOST = 'firebasestorage.googleapis.com';

function getSingleQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function documentPdfProxy(req, res) {
  const rawUrl = getSingleQueryValue(req.query.url);
  if (typeof rawUrl !== 'string') {
    res.status(400).json({ error: 'A document URL is required.' });
    return;
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: 'Invalid document URL.' });
    return;
  }

  const bucket = String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '').trim();
  const expectedPath = `/v0/b/${encodeURIComponent(bucket)}/o/`;
  if (
    sourceUrl.protocol !== 'https:' ||
    sourceUrl.hostname !== STORAGE_HOST ||
    !bucket ||
    !sourceUrl.pathname.startsWith(expectedPath)
  ) {
    res.status(403).json({ error: 'Document source is not allowed.' });
    return;
  }

  const upstream = await fetch(sourceUrl);
  if (!upstream.ok) {
    res.status(upstream.status).json({ error: 'Saved document could not be loaded.' });
    return;
  }

  const pdfBytes = Buffer.from(await upstream.arrayBuffer());
  if (pdfBytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    res.status(502).json({ error: 'Saved file is not a PDF.' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).send(pdfBytes);
}

export function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeRequestDocument(id, data) {
  return {
    id,
    body: data.body || '',
    date: data.date || '',
    fromId: data.fromId || '',
    fromLocation: data.fromLocation || '',
    fromName: data.fromName || 'Customer',
    images: Array.isArray(data.images) ? data.images : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
    media: Array.isArray(data.media) ? data.media : [],
    jobDescription: data.jobDescription || '',
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    locationName: data.locationName || '',
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    mapUrl: data.mapUrl || '',
    profession: data.profession || '',
    requestId: data.requestId || id,
    requestedFrom: data.requestedFrom || '',
    requestedTo: data.requestedTo || '',
    serviceLocationType: data.serviceLocationType || '',
    status: data.status || 'pending',
    timestamp: normalizeTimestamp(data.timestamp || data.receivedAt || data.createdAt),
    title: data.title || 'Work Request',
    type: data.type || 'work_request',
    workerId: data.workerId || '',
    workerName: data.workerName || 'Professional',
    workerNotificationId: data.workerNotificationId || id,
  };
}

export function formatRequestDateTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export function getRequestStatusClass(status) {
  switch (status) {
    case 'accepted':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
    case 'cancelled':
      return 'bg-red-50 text-red-700 ring-red-100';
    case 'declined':
      return 'bg-slate-100 text-slate-700 ring-slate-200';
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-100';
  }
}

export function getRequestMediaItems(request) {
  if (request.media.length > 0) return request.media;

  return [
    ...request.images.map((url) => ({ type: 'image', url })),
    ...request.videos.map((url) => ({ type: 'video', url })),
  ];
}


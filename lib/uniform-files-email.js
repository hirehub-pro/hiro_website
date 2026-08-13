import { getApp } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { ref as storageRef, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

const uniformFilesFunctions = getFunctions(getApp(), 'us-central1');

function safeStorageFilename(filename) {
  return String(filename || 'uniform-files.zip').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadUniformFiles(uid, files) {
  return Promise.all(files.map(async (file, index) => {
    const filename = safeStorageFilename(file.name);
    const storagePath = `users/${uid}/uniform_exports/${Date.now()}_${index}_${filename}`;
    const uploaded = await uploadBytes(storageRef(storage, storagePath), file.blob, {
      contentType: file.type || file.blob?.type || 'application/zip',
      customMetadata: { ownerUid: uid, purpose: 'uniform_files_export' },
    });
    return uploaded.ref.fullPath;
  }));
}

export async function sendUniformFilesEmail({ recipientEmail, files }) {
  const callable = httpsCallable(uniformFilesFunctions, 'sendUniformFilesEmail');
  const result = await callable({ recipientEmail, filePaths: files });
  return result.data;
}

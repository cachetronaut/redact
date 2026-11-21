export async function persistMapping(uid, documentId, revision, mapping) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('redact', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('mappings');
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = reject;
  });
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('mappings', 'readwrite');
      transaction.oncomplete = resolve;
      transaction.onabort = transaction.onerror = reject;
      transaction.objectStore('mappings').add(mapping, [uid, documentId, revision]);
    });
  } finally {
    db.close();
  }
}

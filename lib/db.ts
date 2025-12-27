
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ecoSCheckDB', 3);
    
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        db.createObjectStore('entries', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'type' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveOfflineEntry = async (entry: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('entries', 'readwrite');
    const store = transaction.objectStore('entries');
    const request = store.put({ ...entry, synced: false });
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineEntries = async () => {
  const db = await initDB();
  return new Promise<any[]>((resolve, reject) => {
    const transaction = db.transaction('entries', 'readonly');
    const store = transaction.objectStore('entries');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter((e: any) => !e.synced));
    request.onerror = () => reject(request.error);
  });
};

export const markEntryAsSynced = async (id: string) => {
  const db = await initDB();
  const transaction = db.transaction('entries', 'readwrite');
  const store = transaction.objectStore('entries');
  store.delete(id); // Removemos do local após sincronizar com sucesso
};

export const saveMetadata = async (type: string, data: any) => {
  const db = await initDB();
  const transaction = db.transaction('metadata', 'readwrite');
  const store = transaction.objectStore('metadata');
  store.put({ type, data, timestamp: Date.now() });
};

export const getMetadata = async (type: string) => {
  const db = await initDB();
  return new Promise<any>((resolve, reject) => {
    const transaction = db.transaction('metadata', 'readonly');
    const store = transaction.objectStore('metadata');
    const request = store.get(type);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
};

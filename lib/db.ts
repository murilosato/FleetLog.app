
import { ChecklistEntry } from '../types';

const DB_NAME = 'FleetLogDB';
const DB_VERSION = 1;
const STORES = {
  METADATA: 'metadata',
  OFFLINE_CHECKLISTS: 'offline_checklists'
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA);
      }
      if (!db.objectStoreNames.contains(STORES.OFFLINE_CHECKLISTS)) {
        db.createObjectStore(STORES.OFFLINE_CHECKLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Salva metadados (veículos, itens, usuários) para consulta offline.
 */
export const saveMetadata = async (key: string, data: any): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.put(data, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Recupera metadados do cache local.
 */
export const getMetadata = async (key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.METADATA, 'readonly');
    const store = transaction.objectStore(STORES.METADATA);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Salva uma vistoria localmente quando o usuário está sem internet.
 */
export const saveOfflineEntry = async (entry: ChecklistEntry): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OFFLINE_CHECKLISTS, 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_CHECKLISTS);
    const request = store.add(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Recupera todas as vistorias salvas offline para sincronização futura.
 */
export const getOfflineEntries = async (): Promise<ChecklistEntry[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OFFLINE_CHECKLISTS, 'readonly');
    const store = transaction.objectStore(STORES.OFFLINE_CHECKLISTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Remove uma vistoria do banco local após sincronização bem-sucedida.
 */
export const deleteOfflineEntry = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.OFFLINE_CHECKLISTS, 'readwrite');
    const store = transaction.objectStore(STORES.OFFLINE_CHECKLISTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

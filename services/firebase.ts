import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Firestore, 
  doc, 
  setDoc,
  getDocs,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { CleaningLog, Cleaner, FirebaseConfig } from '../types';

const CONFIG_KEY = 'cleantrack_firebase_config';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export const getStoredConfig = (): FirebaseConfig | null => {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const saveConfig = (config: FirebaseConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Force reload to apply new config
  window.location.reload();
};

export const clearConfig = () => {
  localStorage.removeItem(CONFIG_KEY);
  window.location.reload();
};

export const initFirebase = (): boolean => {
  const config = getStoredConfig();
  if (!config) return false;

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return false;
  }
};

// --- Data Operations ---

export const subscribeToLogs = (callback: (logs: CleaningLog[]) => void) => {
  if (!db) return () => {};

  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs: CleaningLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CleaningLog);
    });
    callback(logs);
  }, (error) => {
    console.error("Logs subscription error:", error);
  });
};

export const addCleaningLog = async (log: CleaningLog) => {
  if (!db) return;
  // Use specific ID if provided, else auto-id (but we usually provide IDs for logs)
  try {
    // We store the ID inside the document as well
    const docRef = doc(collection(db, 'logs'), log.id); 
    await setDoc(docRef, log);
  } catch (e) {
    console.error("Error adding log:", e);
    throw e;
  }
};

export const subscribeToCleaners = (callback: (cleaners: Cleaner[]) => void) => {
  if (!db) return () => {};

  const q = query(collection(db, 'cleaners'));
  return onSnapshot(q, (snapshot) => {
    const cleaners: Cleaner[] = [];
    snapshot.forEach((doc) => {
      cleaners.push({ id: doc.id, ...doc.data() } as Cleaner);
    });
    // Sort by name for consistency
    cleaners.sort((a,b) => a.name.localeCompare(b.name));
    callback(cleaners);
  });
};

export const updateCleaner = async (cleaner: Cleaner) => {
  if (!db) return;
  try {
    const docRef = doc(db, 'cleaners', cleaner.id);
    await setDoc(docRef, cleaner, { merge: true });
  } catch (e) {
    console.error("Error updating cleaner:", e);
  }
};

// Seed initial cleaners if DB is empty
export const seedCleanersIfEmpty = async (defaultCleaners: Cleaner[]) => {
  if (!db) return;
  const colRef = collection(db, 'cleaners');
  const snapshot = await getDocs(colRef);
  
  if (snapshot.empty) {
    const batch = writeBatch(db);
    defaultCleaners.forEach(c => {
      const docRef = doc(colRef, c.id);
      batch.set(docRef, c);
    });
    await batch.commit();
  }
};

// Delete all logs
export const clearAllLogs = async () => {
  if (!db) return;
  const colRef = collection(db, 'logs');
  const snapshot = await getDocs(colRef);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

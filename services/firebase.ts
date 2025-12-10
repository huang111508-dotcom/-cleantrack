import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  Firestore, 
  doc, 
  setDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { CleaningLog, Cleaner, FirebaseConfig } from '../types';

// Hardcoded configuration provided by user
// Using this STRICTLY to ensure mobile and PC are on the same DB.
const DEFAULT_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyBpnGlzbdVSsMbd7UIDMpznEPx8sk6jqP0",
  authDomain: "cleantrack-demo.firebaseapp.com",
  projectId: "cleantrack-demo",
  storageBucket: "cleantrack-demo.firebasestorage.app",
  messagingSenderId: "544577111564",
  appId: "1:544577111564:web:ce05d67d8d889e5c6d9029",
  measurementId: "G-CD8YYGJ0PG"
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Initialize Firebase automatically
export const initFirebase = (): boolean => {
  try {
    // FORCE usage of DEFAULT_CONFIG to fix sync issues.
    const configToUse = DEFAULT_CONFIG;

    if (!getApps().length) {
      app = initializeApp(configToUse);
      if (typeof window !== 'undefined') {
        try {
           getAnalytics(app);
        } catch (e) {
           console.warn("Analytics init failed, continuing...", e);
        }
      }
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    console.log("Firebase initialized successfully with hardcoded config.");
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
  
  // Real-time listener
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs: CleaningLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CleaningLog);
    });
    console.log(`Synced ${logs.length} logs from cloud.`);
    callback(logs);
  }, (error) => {
    console.error("Logs subscription error:", error);
  });

  return unsubscribe;
};

// NEW: Manual fetch for when real-time sync hiccups
export const fetchLogs = async (): Promise<CleaningLog[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const logs: CleaningLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CleaningLog);
    });
    return logs;
  } catch (e) {
    console.error("Error fetching logs manually:", e);
    return [];
  }
};

export const addCleaningLog = async (log: CleaningLog) => {
  if (!db) {
    console.error("Cannot add log: DB not initialized");
    return;
  }
  try {
    const docRef = doc(collection(db, 'logs'), log.id); 
    await setDoc(docRef, log);
    console.log("Log uploaded to cloud:", log.id);
  } catch (e) {
    console.error("Error adding log:", e);
    alert("Error uploading data. Check your internet connection or database rules.");
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

export const getStoredConfig = (): FirebaseConfig | null => null;
export const saveConfig = (config: FirebaseConfig) => {};
export const clearConfig = () => {};
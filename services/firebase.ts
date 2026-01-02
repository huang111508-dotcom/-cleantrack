
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
  deleteDoc,
  getDocs,
  writeBatch,
  where,
  DocumentReference
} from 'firebase/firestore';
import { CleaningLog, Cleaner, Location, Manager, FirebaseConfig, DeletionRequest } from '../types';

// Hardcoded configuration provided by user
const DEFAULT_CONFIG: FirebaseOptions = {
  apiKey: "AIzaSyBpnGlzbdVSsMbd7UIDMpznEPx8sk6jqP0",
  authDomain: "cleantrack-demo.firebaseapp.com",
  projectId: "cleantrack-demo",
  storageBucket: "cleantrack-demo.firebasestorage.app",
  messagingSenderId: "544577111564",
  appId: "1:544577111564:web:ce05d67d8d889e5c6d9029",
  measurementId: "G-CD8YYGJ0PG"
};

const LEGACY_MANAGER_ID = "demo-mgr"; // The ID used in constants.ts

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Initialize Firebase automatically
export const initFirebase = (): boolean => {
  try {
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

    // Persistence removed as requested to ensure fresh data fetch
    console.log("Firebase initialized successfully with hardcoded config.");
    return true;
  } catch (e) {
    console.error("Firebase Init Error:", e);
    return false;
  }
};

// --- Data Operations ---

export const subscribeToLogs = (callback: (logs: CleaningLog[]) => void, managerId?: string) => {
  if (!db) return () => {};

  let q;
  if (managerId) {
    // FIX: Removing orderBy('timestamp') from the Firestore query when using where().
    // Firestore requires a composite index for where() + orderBy(). 
    // To avoid manual index creation for the user, we fetch by ID then sort in client-side JS.
    q = query(
      collection(db, 'logs'), 
      where('managerId', '==', managerId)
    );
  } else {
    // Fallback or Master view can use orderBy if no where clause conflicts
    q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  }
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const logs: CleaningLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CleaningLog);
    });
    
    // Client-side sort to ensure correct order without complex indexes
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // console.log(`Synced ${logs.length} logs from cloud.`); // Removed verbose logging
    callback(logs);
  }, (error) => {
    console.error("Logs subscription error:", error);
  });

  return unsubscribe;
};

// NEW: Manual fetch for when real-time sync hiccups
export const fetchLogs = async (managerId?: string): Promise<CleaningLog[]> => {
  if (!db) return [];
  try {
    let q;
    if (managerId) {
      // Same fix as subscribeToLogs
      q = query(collection(db, 'logs'), where('managerId', '==', managerId));
    } else {
      q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
    }
    const snapshot = await getDocs(q);
    const logs: CleaningLog[] = [];
    snapshot.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() } as CleaningLog);
    });
    
    // Client-side sort
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
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

// --- Managers Operations (NEW) ---

export const subscribeToManagers = (callback: (managers: Manager[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'managers'));
  return onSnapshot(q, (snapshot) => {
    const managers: Manager[] = [];
    snapshot.forEach((doc) => {
      managers.push({ id: doc.id, ...doc.data() } as Manager);
    });
    callback(managers);
  });
};

export const addNewManager = async (name: string, departmentName: string, password: string): Promise<void> => {
  if (!db) return;
  const newId = `mgr-${Date.now()}`;
  const newManager: Manager = { id: newId, name, departmentName, password };
  await setDoc(doc(db, 'managers', newId), newManager);
};

export const updateManager = async (manager: Manager): Promise<void> => {
  if (!db) return;
  try {
    const docRef = doc(db, 'managers', manager.id);
    await setDoc(docRef, manager, { merge: true });
  } catch (e) {
    console.error("Error updating manager:", e);
  }
};

export const deleteManager = async (id: string): Promise<void> => {
  if (!db) return;
  await deleteDoc(doc(db, 'managers', id));
  // Note: ideally should cascading delete cleaners/locations, but keeping simple for now
};


// --- Cleaners Operations ---

export const subscribeToCleaners = (callback: (cleaners: Cleaner[]) => void, managerId?: string) => {
  if (!db) return () => {};

  let q;
  if (managerId) {
    q = query(collection(db, 'cleaners'), where('managerId', '==', managerId));
  } else {
    q = query(collection(db, 'cleaners'));
  }

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

export const addNewCleaner = async (managerId: string, name: string, password: string): Promise<void> => {
  if (!db) return;
  try {
    const newId = `c-${Date.now()}`;
    const avatarId = Math.floor(Math.random() * 70) + 1;
    const newCleaner: Cleaner = {
      id: newId,
      managerId, // Scoped to manager
      name: name,
      password: password,
      avatar: `https://i.pravatar.cc/150?img=${avatarId}` 
    };
    
    await setDoc(doc(db, 'cleaners', newId), newCleaner);
  } catch (e) {
    console.error("Error adding new cleaner:", e);
    throw e;
  }
};

export const deleteCleaner = async (id: string): Promise<void> => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'cleaners', id));
  } catch (e) {
    console.error("Error deleting cleaner:", e);
    throw e;
  }
};

// --- Locations Operations ---

export const subscribeToLocations = (callback: (locations: Location[]) => void, managerId?: string) => {
  if (!db) return () => {};

  let q;
  if (managerId) {
    q = query(collection(db, 'locations'), where('managerId', '==', managerId));
  } else {
    q = query(collection(db, 'locations'));
  }

  return onSnapshot(q, (snapshot) => {
    const locations: Location[] = [];
    snapshot.forEach((doc) => {
      locations.push({ id: doc.id, ...doc.data() } as Location);
    });
    // Sort logic to keep order consistent
    locations.sort((a,b) => {
      const numA = parseInt(a.id.replace('loc', '')) || 0;
      const numB = parseInt(b.id.replace('loc', '')) || 0;
      return numA - numB;
    });
    callback(locations);
  });
};

export const updateLocation = async (location: Location) => {
  if (!db) return;
  try {
    const docRef = doc(db, 'locations', location.id);
    await setDoc(docRef, location, { merge: true });
  } catch (e) {
    console.error("Error updating location:", e);
  }
};

export const addNewLocation = async (managerId: string, nameZh: string, nameEn: string, zone: string, target: number) => {
  if (!db) return;
  const newId = `loc-${Date.now()}`;
  const newLocation: Location = {
    id: newId,
    managerId,
    nameZh,
    nameEn,
    zone,
    targetDailyFrequency: target
  };
  await setDoc(doc(db, 'locations', newId), newLocation);
}

export const deleteLocation = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'locations', id));
}

// --- Deletion Requests Operations (NEW) ---

export const requestLocationDeletion = async (locationId: string, locationName: string, managerId: string, managerName: string, departmentName: string) => {
  if (!db) return;
  const newId = `req-${Date.now()}`;
  const request: DeletionRequest = {
    id: newId,
    locationId,
    locationName,
    managerId,
    managerName,
    departmentName,
    timestamp: Date.now(),
    status: 'pending'
  };
  await setDoc(doc(db, 'deletionRequests', newId), request);
};

export const subscribeToDeletionRequests = (callback: (requests: DeletionRequest[]) => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'deletionRequests'));
  return onSnapshot(q, (snapshot) => {
    const requests: DeletionRequest[] = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() } as DeletionRequest);
    });
    // Sort by timestamp desc
    requests.sort((a, b) => b.timestamp - a.timestamp);
    callback(requests);
  });
};

export const resolveDeletionRequest = async (request: DeletionRequest, approve: boolean) => {
    if (!db) return;
    
    const batch = writeBatch(db);
    
    // 1. Update request status
    const reqRef = doc(db, 'deletionRequests', request.id);
    batch.update(reqRef, { status: approve ? 'approved' : 'rejected' });
    
    // 2. If approved, delete the location
    if (approve) {
        const locRef = doc(db, 'locations', request.locationId);
        batch.delete(locRef);
    }
    
    await batch.commit();
};

export const seedCleanersIfEmpty = async (defaultCleaners: Cleaner[]) => {};

export const seedLocationsIfEmpty = async (defaultLocations: Location[]) => {};

export const clearAllLogs = async (managerId?: string) => {
  if (!db) return;
  const colRef = collection(db, 'logs');
  let q;
  if (managerId) {
    q = query(colRef, where('managerId', '==', managerId));
  } else {
    q = query(colRef);
  }
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

// --- DATA MIGRATION UTILITIES ---

export const getLegacyDataStats = async () => {
  if (!db) return { locations: 0, cleaners: 0, logs: 0 };
  
  try {
    const locSnap = await getDocs(query(collection(db, 'locations'), where('managerId', '==', LEGACY_MANAGER_ID)));
    const cleanSnap = await getDocs(query(collection(db, 'cleaners'), where('managerId', '==', LEGACY_MANAGER_ID)));
    const logSnap = await getDocs(query(collection(db, 'logs'), where('managerId', '==', LEGACY_MANAGER_ID)));

    return {
      locations: locSnap.size,
      cleaners: cleanSnap.size,
      logs: logSnap.size
    };
  } catch (e) {
    console.error("Error getting legacy stats", e);
    return { locations: 0, cleaners: 0, logs: 0 };
  }
};

export const migrateLegacyData = async (targetManagerId: string): Promise<boolean> => {
  if (!db) return false;
  
  try {
    const locSnap = await getDocs(query(collection(db, 'locations'), where('managerId', '==', LEGACY_MANAGER_ID)));
    const cleanSnap = await getDocs(query(collection(db, 'cleaners'), where('managerId', '==', LEGACY_MANAGER_ID)));
    const logSnap = await getDocs(query(collection(db, 'logs'), where('managerId', '==', LEGACY_MANAGER_ID)));

    const allDocs: DocumentReference[] = [];
    
    locSnap.forEach(d => allDocs.push(d.ref));
    cleanSnap.forEach(d => allDocs.push(d.ref));
    logSnap.forEach(d => allDocs.push(d.ref));

    if (allDocs.length === 0) return true;

    // Firestore batch limit is 500 operations
    const CHUNK_SIZE = 450; 
    for (let i = 0; i < allDocs.length; i += CHUNK_SIZE) {
      const chunk = allDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(ref => {
        batch.update(ref, { managerId: targetManagerId });
      });
      await batch.commit();
    }
    
    return true;
  } catch (e) {
    console.error("Migration failed", e);
    return false;
  }
};

export const getStoredConfig = (): FirebaseConfig | null => null;
export const saveConfig = (config: FirebaseConfig) => {};
export const clearConfig = () => {};

export type Language = 'en' | 'zh';

export type UserRole = 'manager' | 'cleaner' | null;

export interface Cleaner {
  id: string;
  name: string;
  avatar: string;
  password?: string; // Added password field
}

export interface Location {
  id: string;
  nameEn: string;
  nameZh: string;
  zone: string; // Keeping zone simple (can be used for filtering)
  targetDailyFrequency: number; 
  lastCleaned?: number; // timestamp
}

export interface CleaningLog {
  id: string;
  locationId: string;
  cleanerId: string;
  timestamp: number;
  status: 'completed' | 'flagged';
  notes?: string;
}

export type ViewState = 'dashboard' | 'cleaner-scan' | 'admin-reports' | 'qr-print';

export interface Alert {
  locationId: string;
  type: 'missed' | 'delayed' | 'frequency_low';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export type Language = 'en' | 'zh';

export type UserRole = 'master' | 'manager' | 'cleaner' | null;

export interface Manager {
  id: string;
  name: string;
  departmentName: string;
  password?: string;
}

export interface Cleaner {
  id: string;
  managerId: string; // Links cleaner to a specific department manager
  name: string;
  avatar: string;
  password?: string; 
}

export interface Location {
  id: string;
  managerId: string; // Links location to a specific department manager
  nameEn: string;
  nameZh: string;
  zone: string; 
  targetDailyFrequency: number; 
  lastCleaned?: number; 
}

export interface CleaningLog {
  id: string;
  managerId: string; // Links log to a specific department manager
  locationId: string;
  cleanerId: string;
  timestamp: number;
  status: 'completed' | 'flagged';
  notes?: string;
}

export type ViewState = 'dashboard' | 'cleaner-scan' | 'admin-reports' | 'qr-print' | 'master-dashboard';

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

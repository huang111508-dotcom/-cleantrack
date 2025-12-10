import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Language, UserRole } from './types';
import { LOCATIONS, CLEANERS, generateInitialLogs, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import CleanerInterface from './components/CleanerInterface';
import QRCodeGenerator from './components/QRCodeGenerator';
import LoginScreen from './components/LoginScreen';
import CloudSetup from './components/CloudSetup';
import { 
  initFirebase, 
  subscribeToLogs, 
  subscribeToCleaners, 
  addCleaningLog, 
  updateCleaner,
  seedCleanersIfEmpty,
  clearAllLogs
} from './services/firebase';
import { LayoutDashboard, Globe, Printer, LogOut, Download, Trash2, Cloud, CloudOff } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [cleanersList, setCleanersList] = useState<Cleaner[]>([]);
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner | undefined>(undefined);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [language, setLanguage] = useState<Language>('zh'); 
  const [showCloudSetup, setShowCloudSetup] = useState(false);

  // Cloud Mode State
  const [isCloudMode, setIsCloudMode] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  const t = TRANSLATIONS[language];

  // 1. Initialize System (Check for Cloud Config or Load Local)
  useEffect(() => {
    const cloudInit = initFirebase();
    setIsCloudMode(cloudInit);
    setIsCloudConnected(cloudInit);

    if (cloudInit) {
      // --- CLOUD MODE INITIALIZATION ---
      
      // Seed cleaners if new DB
      seedCleanersIfEmpty(CLEANERS);

      // Subscribe to Logs
      const unsubLogs = subscribeToLogs((newLogs) => {
        setLogs(newLogs);
      });

      // Subscribe to Cleaners
      const unsubCleaners = subscribeToCleaners((newCleaners) => {
        setCleanersList(newCleaners);
      });

      return () => {
        unsubLogs();
        unsubCleaners();
      };
    } else {
      // --- LOCAL MODE INITIALIZATION ---
      
      // Load Cleaners
      const savedCleaners = localStorage.getItem('cleanersData');
      if (savedCleaners) {
        setCleanersList(JSON.parse(savedCleaners));
      } else {
        setCleanersList(CLEANERS);
      }

      // Load Logs
      const savedLogs = localStorage.getItem('cleaningLogs');
      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      } else {
        const initial = generateInitialLogs();
        setLogs(initial);
        localStorage.setItem('cleaningLogs', JSON.stringify(initial));
      }

      // LocalStorage Listener for cross-tab sync in Local Mode
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'cleaningLogs' && e.newValue) setLogs(JSON.parse(e.newValue));
        if (e.key === 'cleanersData' && e.newValue) setCleanersList(JSON.parse(e.newValue));
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // 2. Persist Local Data (Only in Local Mode)
  useEffect(() => {
    if (!isCloudMode && cleanersList.length > 0) {
      localStorage.setItem('cleanersData', JSON.stringify(cleanersList));
    }
  }, [cleanersList, isCloudMode]);

  useEffect(() => {
    if (!isCloudMode) {
      localStorage.setItem('cleaningLogs', JSON.stringify(logs));
    }
  }, [logs, isCloudMode]);


  // Actions
  const handleLogin = (role: UserRole, cleaner?: Cleaner) => {
    setCurrentUserRole(role);
    if (role === 'cleaner' && cleaner) {
      setCurrentCleaner(cleaner);
      setView('cleaner-scan');
    } else if (role === 'manager') {
      setView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setCurrentCleaner(undefined);
    setView('dashboard'); 
  };

  const handleUpdateCleaner = async (updatedCleaner: Cleaner) => {
    if (isCloudMode) {
      await updateCleaner(updatedCleaner);
    } else {
      setCleanersList(prev => prev.map(c => c.id === updatedCleaner.id ? updatedCleaner : c));
    }
  };

  const handleLogCleaning = async (locationId: string) => {
    if (!currentCleaner) return;

    const newLog: CleaningLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      locationId,
      cleanerId: currentCleaner.id,
      timestamp: Date.now(),
      status: 'completed'
    };
    
    if (isCloudMode) {
      await addCleaningLog(newLog);
    } else {
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const handleResetData = async () => {
    if(confirm(t.resetConfirm)) {
      if (isCloudMode) {
        await clearAllLogs();
      } else {
        setLogs([]);
      }
    }
  }

  const handleRefreshData = () => {
    // Only needed for local mode to force reload from storage if events failed
    if (!isCloudMode) {
       const savedLogs = localStorage.getItem('cleaningLogs');
       if (savedLogs) setLogs(JSON.parse(savedLogs));
    }
  };

  const handleExportData = () => {
    let csvContent = "\uFEFF"; 
    const headers = language === 'zh' 
      ? "日期,时间,点位名称,区域,保洁员,状态\n"
      : "Date,Time,Location,Zone,Cleaner,Status\n";
    csvContent += headers;

    logs.forEach(log => {
      const dateObj = new Date(log.timestamp);
      const loc = LOCATIONS.find(l => l.id === log.locationId);
      const locName = loc ? (language === 'zh' ? loc.nameZh : loc.nameEn) : 'Unknown';
      const zone = loc ? loc.zone : 'Unknown';
      const cleaner = cleanersList.find(c => c.id === log.cleanerId);
      const cleanerName = cleaner ? cleaner.name : 'Unknown';
      
      const row = [
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        `"${locName}"`,
        `"${zone}"`,
        `"${cleanerName}"`,
        log.status
      ].join(",");
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cleaning_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  }

  // Render
  if (!currentUserRole) {
    return (
      <>
        <div className="absolute top-4 right-4 z-50">
           <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-sm border border-slate-200 text-sm font-medium text-slate-500 hover:text-brand-600"
            >
              <Globe size={16} />
              <span>{language === 'en' ? '中文' : 'En'}</span>
            </button>
        </div>
        <LoginScreen 
          cleaners={cleanersList.length > 0 ? cleanersList : CLEANERS} // Fallback to constant if init hasn't finished
          onLogin={handleLogin} 
          language={language} 
        />
        <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center gap-2 text-xs text-slate-400">
           {isCloudMode ? (
             <span className="flex items-center gap-1 text-green-600 font-medium">
               <Cloud size={12} /> {language === 'zh' ? '云端同步已开启' : 'Cloud Sync Active'}
             </span>
           ) : (
             <span className="flex items-center gap-1">
               <CloudOff size={12} /> {language === 'zh' ? '本地演示模式 (无跨设备同步)' : 'Local Demo Mode (No Sync)'}
             </span>
           )}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <CloudSetup 
        isOpen={showCloudSetup} 
        onClose={() => setShowCloudSetup(false)} 
        language={language} 
      />

      {currentUserRole === 'manager' && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                  CT
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800 hidden sm:block">
                  {t.appTitle}
                </span>
                <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded border border-slate-200 uppercase font-bold">Manager</span>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <button 
                  onClick={() => setShowCloudSetup(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isCloudMode 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                  title="Setup Cloud Sync"
                >
                  {isCloudMode ? <Cloud size={16} /> : <CloudOff size={16} />}
                  <span className="hidden sm:inline">
                    {isCloudMode 
                      ? (language === 'zh' ? '已同步' : 'Synced') 
                      : (language === 'zh' ? '配置云端' : 'Setup Sync')}
                  </span>
                </button>

                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      view === 'dashboard' 
                        ? 'bg-white text-brand-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutDashboard size={16} />
                    <span className="hidden sm:inline">{t.manager}</span>
                  </button>
                  <button
                    onClick={() => setView('qr-print')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      view === 'qr-print' 
                        ? 'bg-white text-brand-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">{t.qrCodes}</span>
                  </button>
                </div>

                <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                   <button 
                    onClick={handleExportData} 
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-600 px-2 py-1 hover:bg-slate-50 rounded"
                    title={t.export}
                   >
                    <Download size={14} />
                    {t.export}
                  </button>
                  <button 
                    onClick={handleResetData} 
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded"
                    title={t.reset}
                  >
                    <Trash2 size={14} />
                    {t.reset}
                  </button>
                </div>

                <button 
                  onClick={handleLogout}
                  className="ml-2 p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"
                  title={t.logout}
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {currentUserRole === 'manager' && view === 'dashboard' && (
          <Dashboard 
            locations={LOCATIONS} 
            logs={logs} 
            cleaners={cleanersList}
            onUpdateCleaner={handleUpdateCleaner}
            language={language}
            onRefresh={handleRefreshData}
          />
        )}
        
        {currentUserRole === 'manager' && view === 'qr-print' && (
          <QRCodeGenerator
            locations={LOCATIONS}
            language={language}
          />
        )}

        {currentUserRole === 'cleaner' && currentCleaner && (
          <CleanerInterface 
            locations={LOCATIONS}
            currentCleaner={currentCleaner}
            onLogCleaning={handleLogCleaning}
            language={language}
            onLogout={handleLogout}
          />
        )}
      </main>

    </div>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Language, UserRole } from './types';
import { LOCATIONS, CLEANERS, generateInitialLogs, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import CleanerInterface from './components/CleanerInterface';
import QRCodeGenerator from './components/QRCodeGenerator';
import LoginScreen from './components/LoginScreen';
import { 
  initFirebase, 
  subscribeToLogs, 
  subscribeToCleaners, 
  addCleaningLog, 
  updateCleaner,
  seedCleanersIfEmpty,
  clearAllLogs,
  fetchLogs 
} from './services/firebase';
import { LayoutDashboard, Globe, Printer, LogOut, Download, Trash2, Cloud } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [cleanersList, setCleanersList] = useState<Cleaner[]>([]);
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner | undefined>(undefined);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [language, setLanguage] = useState<Language>('zh'); 

  // Cloud Mode State
  const [isCloudMode, setIsCloudMode] = useState(true);

  const t = TRANSLATIONS[language];

  // 1. Initialize System
  useEffect(() => {
    const cloudInit = initFirebase();
    setIsCloudMode(cloudInit);

    if (cloudInit) {
      seedCleanersIfEmpty(CLEANERS);
      const unsubLogs = subscribeToLogs((newLogs) => setLogs(newLogs));
      const unsubCleaners = subscribeToCleaners((newCleaners) => setCleanersList(newCleaners));
      return () => { unsubLogs(); unsubCleaners(); };
    } else {
      console.warn("Cloud init failed, falling back to local storage");
      const savedCleaners = localStorage.getItem('cleanersData');
      if (savedCleaners) setCleanersList(JSON.parse(savedCleaners));
      else setCleanersList(CLEANERS);

      const savedLogs = localStorage.getItem('cleaningLogs');
      if (savedLogs) setLogs(JSON.parse(savedLogs));
      else {
        const initial = generateInitialLogs();
        setLogs(initial);
        localStorage.setItem('cleaningLogs', JSON.stringify(initial));
      }
    }
  }, []);

  // 2. Persist Local Data
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
    if (isCloudMode) await addCleaningLog(newLog);
    else setLogs(prev => [newLog, ...prev]);
  };

  const handleResetData = async () => {
    if(confirm(t.resetConfirm)) {
      if (isCloudMode) await clearAllLogs();
      else setLogs([]);
    }
  }

  const handleRefreshData = async () => {
    if (isCloudMode) {
       const freshLogs = await fetchLogs();
       setLogs(freshLogs);
       console.log("Manually refreshed logs from cloud");
    } else {
       const savedLogs = localStorage.getItem('cleaningLogs');
       if (savedLogs) setLogs(JSON.parse(savedLogs));
    }
  };

  const handleExportData = () => {
    let csvContent = "\uFEFF"; 
    const headers = language === 'zh' ? "日期,时间,点位名称,区域,保洁员,状态\n" : "Date,Time,Location,Zone,Cleaner,Status\n";
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

  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'zh' : 'en');

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative">
      
      {/* GLOBAL: Language Toggle */}
      <div className="fixed top-4 right-4 z-[9999] no-print">
         <button 
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white shadow-md border border-slate-200 text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
          >
            <Globe size={16} />
            <span>{language === 'en' ? '中文' : 'En'}</span>
          </button>
      </div>

      {/* MAIN VIEW SWITCHER */}
      {!currentUserRole ? (
        <LoginScreen 
          cleaners={cleanersList.length > 0 ? cleanersList : CLEANERS}
          onLogin={handleLogin} 
          language={language} 
        />
      ) : (
        <>
          {currentUserRole === 'manager' && (
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                      CT
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-800">
                      {t.appTitle}
                    </span>
                    <span className="ml-1 text-[10px] text-white bg-brand-500 px-1.5 py-0.5 rounded-full font-bold">v3.0</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-green-50 border border-green-100 text-xs text-green-700 font-medium animate-fade-in">
                      <Cloud size={14} className="text-green-500" />
                      <span className="hidden sm:inline">{language === 'zh' ? '云端在线' : 'Cloud Online'}</span>
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                    <div className="flex bg-slate-100 rounded-lg p-1 hidden sm:flex">
                      <button
                        onClick={() => setView('dashboard')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          view === 'dashboard' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <LayoutDashboard size={16} />
                        <span className="hidden sm:inline">{t.manager}</span>
                      </button>
                      <button
                        onClick={() => setView('qr-print')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          view === 'qr-print' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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
                isCloudMode={isCloudMode}
              />
            )}
            
            {currentUserRole === 'manager' && view === 'qr-print' && (
              <QRCodeGenerator locations={LOCATIONS} language={language} />
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
        </>
      )}
    </div>
  );
};

export default App;
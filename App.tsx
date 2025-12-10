import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Language, UserRole } from './types';
import { LOCATIONS, CLEANERS, generateInitialLogs, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import CleanerInterface from './components/CleanerInterface';
import QRCodeGenerator from './components/QRCodeGenerator';
import LoginScreen from './components/LoginScreen';
import { LayoutDashboard, Globe, Printer, LogOut, Download, Trash2 } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [cleanersList, setCleanersList] = useState<Cleaner[]>(CLEANERS);
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner | undefined>(undefined);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [language, setLanguage] = useState<Language>('zh'); 

  const t = TRANSLATIONS[language];

  // Initialize Data
  useEffect(() => {
    // 1. Logs
    const savedLogs = localStorage.getItem('cleaningLogs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      // For first time load, we still generate some dummy data so the user sees something.
      // But "Reset" will clear it.
      const initial = generateInitialLogs();
      setLogs(initial);
      localStorage.setItem('cleaningLogs', JSON.stringify(initial));
    }

    // 2. Cleaners (with passwords)
    const savedCleaners = localStorage.getItem('cleanersData');
    if (savedCleaners) {
      setCleanersList(JSON.parse(savedCleaners));
    } else {
      // Use defaults
      setCleanersList(CLEANERS);
    }
  }, []);

  // Save logs on change
  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('cleaningLogs', JSON.stringify(logs));
    } else {
      // If logs are empty array (after reset), we should still save that state
      // check if it was initialized to avoid wiping on first render before useEffect runs
      if (localStorage.getItem('cleaningLogs')) { 
        localStorage.setItem('cleaningLogs', JSON.stringify([]));
      }
    }
  }, [logs]);

  // Save cleaners on change (password updates)
  useEffect(() => {
    if (cleanersList.length > 0) {
      localStorage.setItem('cleanersData', JSON.stringify(cleanersList));
    }
  }, [cleanersList]);

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
    setView('dashboard'); // Reset view for next login but essentially shows login screen
  };

  const handleUpdateCleaner = (updatedCleaner: Cleaner) => {
    setCleanersList(prev => prev.map(c => c.id === updatedCleaner.id ? updatedCleaner : c));
  };

  const handleLogCleaning = (locationId: string) => {
    if (!currentCleaner) return;

    const newLog: CleaningLog = {
      id: `log-${Date.now()}`,
      locationId,
      cleanerId: currentCleaner.id,
      timestamp: Date.now(),
      status: 'completed'
    };
    
    // Prepend to logs (newest first)
    setLogs(prev => [newLog, ...prev]);
  };

  const handleResetData = () => {
    if(confirm(t.resetConfirm)) {
      setLogs([]);
      localStorage.setItem('cleaningLogs', JSON.stringify([]));
    }
  }

  const handleExportData = () => {
    // 1. Prepare CSV Content
    // Add BOM for UTF-8 compatibility in Excel
    let csvContent = "\uFEFF"; 
    
    // Headers
    const headers = language === 'zh' 
      ? "日期,时间,点位名称,区域,保洁员,状态\n"
      : "Date,Time,Location,Zone,Cleaner,Status\n";
    
    csvContent += headers;

    // Rows
    logs.forEach(log => {
      const dateObj = new Date(log.timestamp);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString();
      
      const loc = LOCATIONS.find(l => l.id === log.locationId);
      const locName = loc ? (language === 'zh' ? loc.nameZh : loc.nameEn) : 'Unknown';
      const zone = loc ? loc.zone : 'Unknown';
      
      const cleaner = cleanersList.find(c => c.id === log.cleanerId);
      const cleanerName = cleaner ? cleaner.name : 'Unknown';
      
      // Escape commas in names just in case
      const row = [
        dateStr,
        timeStr,
        `"${locName}"`,
        `"${zone}"`,
        `"${cleanerName}"`,
        log.status
      ].join(",");
      
      csvContent += row + "\n";
    });

    // 2. Trigger Download
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

  // If not logged in, show Login Screen
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
          cleaners={cleanersList} 
          onLogin={handleLogin} 
          language={language} 
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Navigation Header - ONLY for Manager */}
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
                  onClick={toggleLanguage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
                >
                  <Globe size={16} />
                  <span>{language === 'en' ? '中文' : 'En'}</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Manager Views */}
        {currentUserRole === 'manager' && view === 'dashboard' && (
          <Dashboard 
            locations={LOCATIONS} 
            logs={logs} 
            cleaners={cleanersList}
            onUpdateCleaner={handleUpdateCleaner}
            language={language}
          />
        )}
        
        {currentUserRole === 'manager' && view === 'qr-print' && (
          <QRCodeGenerator
            locations={LOCATIONS}
            language={language}
          />
        )}

        {/* Cleaner View - Locked */}
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
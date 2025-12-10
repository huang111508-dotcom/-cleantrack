import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Language } from './types';
import { LOCATIONS, CLEANERS, generateInitialLogs, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import CleanerInterface from './components/CleanerInterface';
import QRCodeGenerator from './components/QRCodeGenerator';
import { LayoutDashboard, Smartphone, Globe, Printer } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [view, setView] = useState<ViewState>('dashboard');
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner>(CLEANERS[0]);
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese

  const t = TRANSLATIONS[language];

  // Initialize Data
  useEffect(() => {
    // Check localStorage first, else generate dummy data
    const savedLogs = localStorage.getItem('cleaningLogs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      const initial = generateInitialLogs();
      setLogs(initial);
      localStorage.setItem('cleaningLogs', JSON.stringify(initial));
    }
  }, []);

  // Save logs on change
  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('cleaningLogs', JSON.stringify(logs));
    }
  }, [logs]);

  const handleLogCleaning = (locationId: string) => {
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
    if(confirm("Reset all data for demo? / 重置演示数据？")) {
      const initial = generateInitialLogs();
      setLogs(initial);
      localStorage.setItem('cleaningLogs', JSON.stringify(initial));
    }
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* Navigation Header */}
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
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Language Toggle */}
              <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-brand-600 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              >
                <Globe size={16} />
                <span>{language === 'en' ? '中文' : 'English'}</span>
              </button>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              {/* View Switcher for Demo Purposes */}
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
                <button
                  onClick={() => setView('cleaner-scan')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    view === 'cleaner-scan' 
                      ? 'bg-white text-brand-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Smartphone size={16} />
                  <span className="hidden sm:inline">{t.cleanerApp}</span>
                </button>
              </div>

              {view === 'cleaner-scan' && (
                 <select 
                   className="text-sm border-none bg-transparent text-slate-600 font-medium focus:ring-0 cursor-pointer hidden sm:block"
                   value={currentCleaner.id}
                   onChange={(e) => {
                     const c = CLEANERS.find(cl => cl.id === e.target.value);
                     if (c) setCurrentCleaner(c);
                   }}
                 >
                   {CLEANERS.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                 </select>
              )}

              <button onClick={handleResetData} className="text-xs text-slate-400 hover:text-red-500 underline hidden lg:block">
                {t.reset}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && (
          <Dashboard 
            locations={LOCATIONS} 
            logs={logs} 
            cleaners={CLEANERS} 
            language={language}
          />
        )}
        
        {view === 'qr-print' && (
          <QRCodeGenerator
            locations={LOCATIONS}
            language={language}
          />
        )}

        {view === 'cleaner-scan' && (
          <CleanerInterface 
            locations={LOCATIONS}
            currentCleaner={currentCleaner}
            onLogCleaning={handleLogCleaning}
            language={language}
          />
        )}
      </main>

    </div>
  );
};

export default App;
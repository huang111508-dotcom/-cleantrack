
import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Location, Language, UserRole, Manager } from './types';
import { LOCATIONS, CLEANERS, TRANSLATIONS } from './constants';
import Dashboard from './components/Dashboard';
import MasterDashboard from './components/MasterDashboard';
import CleanerInterface from './components/CleanerInterface';
import QRCodeGenerator from './components/QRCodeGenerator';
import LoginScreen from './components/LoginScreen';
import { 
  initFirebase, 
  subscribeToLogs, 
  subscribeToCleaners, 
  subscribeToLocations, 
  subscribeToManagers, // New
  updateLocation, 
  addNewLocation, // New
  deleteLocation, // New
  addCleaningLog, 
  updateCleaner,
  addNewCleaner, 
  deleteCleaner, 
  clearAllLogs,
  fetchLogs,
  addNewManager, // New
  deleteManager // New
} from './services/firebase';
import { LayoutDashboard, Globe, Printer, LogOut, Download, Trash2, Cloud, Building2 } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  
  // Data State
  const [managersList, setManagersList] = useState<Manager[]>([]);
  const [cleanersList, setCleanersList] = useState<Cleaner[]>([]);
  const [locationsList, setLocationsList] = useState<Location[]>([]); 
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  
  // Session State
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner | undefined>(undefined);
  const [currentManager, setCurrentManager] = useState<Manager | undefined>(undefined);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [language, setLanguage] = useState<Language>('zh'); 

  // Cloud Mode State
  const [isCloudMode, setIsCloudMode] = useState(true);

  const t = TRANSLATIONS[language];

  // 1. Initialize System & Master Subscriptions
  useEffect(() => {
    const cloudInit = initFirebase();
    setIsCloudMode(cloudInit);

    if (cloudInit) {
      // Subscribe to Managers List (Public/Visible for Login selection)
      const unsubManagers = subscribeToManagers((mgrs) => setManagersList(mgrs));
      return () => { unsubManagers(); };
    } 
  }, []);

  // 2. Role-Based Data Subscriptions
  useEffect(() => {
    if (!isCloudMode) return;
    
    // cleanup previous subscriptions
    let unsubLogs = () => {};
    let unsubCleaners = () => {};
    let unsubLocations = () => {};

    if (currentUserRole === 'manager' && currentManager) {
        // Manager View: Scoped to their ID
        unsubLogs = subscribeToLogs(setLogs, currentManager.id);
        unsubCleaners = subscribeToCleaners(setCleanersList, currentManager.id);
        unsubLocations = subscribeToLocations(setLocationsList, currentManager.id);
    } 
    else if (currentUserRole === 'cleaner' && currentCleaner) {
        // Cleaner View: Scoped to their Manager ID (need to see locations)
        unsubLocations = subscribeToLocations(setLocationsList, currentCleaner.managerId);
        // Cleaners don't necessarily need logs/other cleaners, but if we wanted to show leaderboard, we would fetch them.
    }

    return () => { 
        unsubLogs(); 
        unsubCleaners(); 
        unsubLocations(); 
    };
  }, [currentUserRole, currentManager, currentCleaner, isCloudMode]);


  // Actions
  const handleLogin = (role: UserRole, data?: any) => {
    setCurrentUserRole(role);
    if (role === 'cleaner' && data) {
      setCurrentCleaner(data);
      setView('cleaner-scan');
    } else if (role === 'manager' && data) {
      setCurrentManager(data);
      setView('dashboard');
    } else if (role === 'master') {
      setView('master-dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setCurrentCleaner(undefined);
    setCurrentManager(undefined);
    setView('dashboard'); // reset view
    // Clear data to prevent flashing old data on re-login
    setLogs([]);
    setCleanersList([]);
    setLocationsList([]);
  };

  // --- MASTER ACTIONS ---
  const handleAddManager = async (name: string, dept: string, pass: string) => {
    await addNewManager(name, dept, pass);
  };
  
  const handleDeleteManager = async (id: string) => {
    if(confirm(language === 'zh' ? '确定删除该部门及其管理员吗？' : 'Delete this department?')) {
      await deleteManager(id);
    }
  };

  // --- MANAGER ACTIONS ---

  const handleUpdateCleaner = async (updatedCleaner: Cleaner) => {
    await updateCleaner(updatedCleaner);
  };

  const handleUpdateLocation = async (updatedLocation: Location) => {
    await updateLocation(updatedLocation);
  };

  const handleAddCleaner = async (name: string, password: string) => {
    if (currentManager) {
      await addNewCleaner(currentManager.id, name, password);
    }
  };

  const handleDeleteCleaner = async (id: string) => {
    if(confirm(language === 'zh' ? '确定要删除该保洁员吗？' : 'Delete this cleaner?')) {
      await deleteCleaner(id);
    }
  };

  const handleAddLocation = async (nameZh: string, nameEn: string, zone: string, target: number) => {
    if (currentManager) {
        await addNewLocation(currentManager.id, nameZh, nameEn, zone, target);
    }
  }

  const handleDeleteLocation = async (id: string) => {
    if(confirm(language === 'zh' ? '确定要删除该点位吗？' : 'Delete this location?')) {
        await deleteLocation(id);
    }
  }

  const handleLogCleaning = async (locationId: string) => {
    if (!currentCleaner) return;
    const newLog: CleaningLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      locationId,
      managerId: currentCleaner.managerId, // Tag log with manager ID
      cleanerId: currentCleaner.id,
      timestamp: Date.now(),
      status: 'completed'
    };
    await addCleaningLog(newLog);
  };

  const handleResetData = async () => {
    if(confirm(t.resetConfirm)) {
      if (currentManager) {
        await clearAllLogs(currentManager.id);
      }
    }
  }

  const handleRefreshData = async () => {
     // Trigger re-fetch logic if needed, largely handled by snapshot listeners
     console.log("Refreshing...");
  };

  const handleExportData = () => {
    let csvContent = "\uFEFF"; 
    const headers = language === 'zh' ? "日期,时间,点位名称,区域,保洁员,状态\n" : "Date,Time,Location,Zone,Cleaner,Status\n";
    csvContent += headers;

    logs.forEach(log => {
      const dateObj = new Date(log.timestamp);
      const loc = locationsList.find(l => l.id === log.locationId);
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
          cleaners={cleanersList} // Note: This might be empty initially, fetch happens on selection logic in LoginScreen if optimized, or we fetch all here? 
                                  // For simplicity in this demo, subscribeToManagers happens first. LoginScreen handles fetching cleaners after dept select or we subscribe all.
                                  // In real app, we fetch cleaners ON demand. For now, let's allow LoginScreen to filter.
                                  // Wait, cleanersList is only populated if logged in? We need a way to list cleaners for login.
                                  // FIX: We need a global cleaner subscription for the login screen OR fetch on dept select.
                                  // Let's implement "Fetch All Cleaners" for login screen temporarily or rely on LoginScreen to query.
                                  // Actually, let's subscribe to ALL cleaners in Login State for simplicity in this demo (if dataset small).
                                  // See below useEffect hack.
          managers={managersList}
          onLogin={handleLogin} 
          language={language} 
        />
      ) : (
        <>
          {(currentUserRole === 'manager' || currentUserRole === 'master') && (
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                      CT
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-800 hidden md:block">
                      {t.appTitle}
                    </span>
                    <span className="ml-1 text-[10px] text-white bg-brand-500 px-1.5 py-0.5 rounded-full font-bold">v4.0</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4">
                    {/* Role Badge */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                        {currentUserRole === 'master' ? <Cloud size={14}/> : <Building2 size={14}/>}
                        {currentUserRole === 'master' ? 'Master Admin' : currentManager?.departmentName}
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                    {/* Nav Items */}
                    <div className="flex bg-slate-100 rounded-lg p-1 hidden sm:flex">
                      <button
                        onClick={() => setView(currentUserRole === 'master' ? 'master-dashboard' : 'dashboard')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          (view === 'dashboard' || view === 'master-dashboard') ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <LayoutDashboard size={16} />
                        <span className="hidden sm:inline">{currentUserRole === 'master' ? 'Admin' : t.manager}</span>
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
                      {currentUserRole === 'manager' && (
                        <button 
                            onClick={handleResetData} 
                            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded"
                            title={t.reset}
                        >
                            <Trash2 size={14} />
                            {t.reset}
                        </button>
                      )}
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
            
            {/* MASTER VIEW */}
            {currentUserRole === 'master' && view === 'master-dashboard' && (
               <MasterDashboard 
                  managers={managersList}
                  onAddManager={handleAddManager}
                  onDeleteManager={handleDeleteManager}
                  language={language}
               />
            )}

            {/* MANAGER DASHBOARD VIEW */}
            {currentUserRole === 'manager' && view === 'dashboard' && currentManager && (
              <Dashboard 
                locations={locationsList} 
                logs={logs} 
                cleaners={cleanersList}
                departmentName={currentManager.departmentName}
                onUpdateCleaner={handleUpdateCleaner}
                onUpdateLocation={handleUpdateLocation} 
                onAddCleaner={handleAddCleaner}
                onDeleteCleaner={handleDeleteCleaner} 
                onAddLocation={handleAddLocation}
                onDeleteLocation={handleDeleteLocation}
                language={language}
                onRefresh={handleRefreshData}
                isCloudMode={isCloudMode}
              />
            )}
            
            {/* PRINT VIEW (Shared) */}
            {((currentUserRole === 'manager' && view === 'qr-print') || (currentUserRole === 'master' && view === 'qr-print')) && (
              <QRCodeGenerator locations={currentUserRole === 'master' ? [] : locationsList} language={language} /> // Master doesn't see locations usually
            )}

            {/* CLEANER VIEW */}
            {currentUserRole === 'cleaner' && currentCleaner && (
              <CleanerInterface 
                locations={locationsList}
                currentCleaner={currentCleaner}
                onLogCleaning={handleLogCleaning}
                language={language}
                onLogout={handleLogout}
              />
            )}
          </main>
        </>
      )}

      {/* Temp Hack to load all cleaners for login screen when no user is logged in */}
      {/* In production, we'd query API on selection. Here we use a hidden subscriber */}
      {!currentUserRole && <CleanerListSubscriber setCleaners={setCleanersList} />}
    </div>
  );
};

// Helper component to fetch cleaners for login screen
const CleanerListSubscriber = ({ setCleaners }: { setCleaners: (c: Cleaner[]) => void }) => {
    useEffect(() => {
        const unsub = subscribeToCleaners(setCleaners); // Subscribe to ALL cleaners
        return () => unsub();
    }, []);
    return null;
}

export default App;

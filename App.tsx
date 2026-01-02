
import React, { useState, useEffect } from 'react';
import { ViewState, CleaningLog, Cleaner, Location, Language, UserRole, Manager, DeletionRequest } from './types';
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
  subscribeToManagers, 
  updateLocation, 
  addNewLocation, 
  deleteLocation, 
  addCleaningLog, 
  updateCleaner,
  addNewCleaner, 
  deleteCleaner, 
  clearAllLogs,
  fetchLogs,
  addNewManager, 
  updateManager,
  deleteManager,
  requestLocationDeletion, 
  subscribeToDeletionRequests, 
  resolveDeletionRequest 
} from './services/firebase';
import { LayoutDashboard, Globe, Printer, LogOut, Download, Trash2, Cloud, Building2 } from 'lucide-react';

const App: React.FC = () => {
  // Application State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // NEW: Global Loading State
  
  // Data State
  const [managersList, setManagersList] = useState<Manager[]>([]);
  const [cleanersList, setCleanersList] = useState<Cleaner[]>([]);
  const [locationsList, setLocationsList] = useState<Location[]>([]); 
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  // NEW: Deletion Requests for Master Admin
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  
  // Session State
  const [currentCleaner, setCurrentCleaner] = useState<Cleaner | undefined>(undefined);
  const [currentManager, setCurrentManager] = useState<Manager | undefined>(undefined);
  // NEW: State for Master Admin to track which department they are viewing
  const [masterSelectedManagerId, setMasterSelectedManagerId] = useState<string | null>(null);
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [language, setLanguage] = useState<Language>('zh'); 

  // Cloud Mode State
  const [isCloudMode, setIsCloudMode] = useState(true);

  const t = TRANSLATIONS[language];

  // Helper to determine which manager ID to use for operations
  const getActiveManagerId = () => {
    if (currentUserRole === 'manager') return currentManager?.id;
    if (currentUserRole === 'master') return masterSelectedManagerId;
    return null;
  };

  // 1. Initialize System & Master Subscriptions (Always Run)
  useEffect(() => {
    const cloudInit = initFirebase();
    setIsCloudMode(cloudInit);

    if (cloudInit) {
      // Subscribe to Managers List (Always needed for Login selection)
      const unsubManagers = subscribeToManagers((mgrs) => setManagersList(mgrs));
      return () => { unsubManagers(); };
    } 
  }, []);

  // 2. Dynamic Data Subscriptions based on Role
  useEffect(() => {
    if (!isCloudMode) return;
    
    // cleanup previous subscriptions
    let unsubLogs = () => {};
    let unsubCleaners = () => {};
    let unsubLocations = () => {};
    let unsubRequests = () => {}; 

    // Helper to turn off loading when data arrives
    const handleDataLoad = () => {
        // We use a small timeout to ensure the UI feels responsive but doesn't flicker
        setTimeout(() => setIsLoading(false), 300); 
    };

    if (currentUserRole === 'manager' && currentManager) {
        // --- Manager View: Scoped to their ID ---
        console.log("Subscribing to Manager Data:", currentManager.id);
        setIsLoading(true); // Start loading
        
        // OPTIMIZATION: Don't wait for logs to unblock UI. Logs are heavy and will stream in.
        unsubLogs = subscribeToLogs((data) => {
            setLogs(data);
        }, currentManager.id);

        unsubCleaners = subscribeToCleaners(setCleanersList, currentManager.id);
        
        // OPTIMIZATION: Unblock UI as soon as Locations (structure) are ready
        unsubLocations = subscribeToLocations((data) => {
            setLocationsList(data);
            handleDataLoad(); 
        }, currentManager.id);
    } 
    else if (currentUserRole === 'cleaner' && currentCleaner) {
        // --- Cleaner View: Scoped to their Manager ID ---
        console.log("Subscribing to Cleaner Data for Manager:", currentCleaner.managerId);
        setIsLoading(true);
        unsubLocations = subscribeToLocations((data) => {
            setLocationsList(data);
            handleDataLoad();
        }, currentCleaner.managerId);
    }
    else if (currentUserRole === 'master') {
        // --- Master View ---
        // 1. Always subscribe to deletion requests
        console.log("Master subscribing to global deletion requests");
        unsubRequests = subscribeToDeletionRequests(setDeletionRequests);

        // 2. If viewing a specific department, subscribe to that data
        if (masterSelectedManagerId) {
          console.log("Master subscribing to target Manager Data:", masterSelectedManagerId);
          setIsLoading(true); // Start loading when switching depts
          
          unsubLogs = subscribeToLogs((data) => {
              setLogs(data);
              // We don't block UI on logs here either
          }, masterSelectedManagerId);
          
          unsubCleaners = subscribeToCleaners(setCleanersList, masterSelectedManagerId);
          
          unsubLocations = subscribeToLocations((data) => {
              setLocationsList(data);
              handleDataLoad();
          }, masterSelectedManagerId);
        } else {
            // If on main master dashboard (list of managers), we are not loading logs
            setIsLoading(false);
        }
    }
    else if (!currentUserRole) {
        // --- Logged Out View (Login Screen) ---
        console.log("Subscribing to ALL Cleaners for Login Screen");
        unsubCleaners = subscribeToCleaners((allCleaners) => {
          setCleanersList(allCleaners);
        });
    }

    return () => { 
        unsubLogs(); 
        unsubCleaners(); 
        unsubLocations(); 
        unsubRequests();
    };
  }, [currentUserRole, currentManager, currentCleaner, masterSelectedManagerId, isCloudMode]);


  // Actions
  const handleLogin = (role: UserRole, data?: any) => {
    setIsLoading(true); // Immediate feedback on button click
    setCurrentUserRole(role);
    if (role === 'cleaner' && data) {
      setCurrentCleaner(data);
      setView('cleaner-scan');
    } else if (role === 'manager' && data) {
      setCurrentManager(data);
      setView('dashboard');
    } else if (role === 'master') {
      setView('master-dashboard');
      setMasterSelectedManagerId(null); // Reset selection on login
    }
  };

  const handleLogout = () => {
    setCurrentUserRole(null);
    setCurrentCleaner(undefined);
    setCurrentManager(undefined);
    setMasterSelectedManagerId(null);
    setView('dashboard'); // reset view
    // Clear data to prevent flashing old data on re-login
    setLogs([]);
    setCleanersList([]);
    setLocationsList([]);
    setDeletionRequests([]);
    setIsLoading(false);
  };

  // --- MASTER ACTIONS ---
  const handleAddManager = async (name: string, dept: string, pass: string) => {
    await addNewManager(name, dept, pass);
  };
  
  const handleUpdateManager = async (manager: Manager) => {
    await updateManager(manager);
  };

  const handleDeleteManager = async (id: string) => {
    if(confirm(language === 'zh' ? '确定删除该部门及其管理员吗？' : 'Delete this department?')) {
      await deleteManager(id);
      if (masterSelectedManagerId === id) {
        setMasterSelectedManagerId(null);
      }
    }
  };

  const handleResolveDeletionRequest = async (req: DeletionRequest, approve: boolean) => {
     try {
        await resolveDeletionRequest(req, approve);
        // Optimistically remove from local state to feel faster, though subscription will sync it
        setDeletionRequests(prev => prev.filter(r => r.id !== req.id));
     } catch (e) {
        console.error("Failed to resolve request:", e);
        alert(language === 'zh' ? '处理请求失败' : 'Failed to resolve request');
     }
  };

  // --- DATA ACTIONS (Shared between Manager and Master) ---

  const handleUpdateCleaner = async (updatedCleaner: Cleaner) => {
    await updateCleaner(updatedCleaner);
  };

  const handleUpdateLocation = async (updatedLocation: Location) => {
    await updateLocation(updatedLocation);
  };

  const handleAddCleaner = async (name: string, password: string) => {
    const targetId = getActiveManagerId();
    if (targetId) {
      await addNewCleaner(targetId, name, password);
    }
  };

  const handleDeleteCleaner = async (id: string) => {
    if(confirm(language === 'zh' ? '确定要删除该保洁员吗？' : 'Delete this cleaner?')) {
      await deleteCleaner(id);
    }
  };

  const handleAddLocation = async (nameZh: string, nameEn: string, zone: string, target: number) => {
    const targetId = getActiveManagerId();
    if (targetId) {
        await addNewLocation(targetId, nameZh, nameEn, zone, target);
    }
  }

  // UPDATED: Robust logic to handle conditional deletion based on role
  const handleDeleteLocation = async (id: string) => {
    console.log("Attempting to delete location:", id, "Role:", currentUserRole);
    
    // Check cloud mode first
    if (!isCloudMode) {
        alert(language === 'zh' ? '系统未连接到数据库，无法执行删除操作。' : 'Cannot delete location: System offline.');
        return;
    }

    const loc = locationsList.find(l => l.id === id);
    if (!loc) {
        console.error("Location not found in list:", id);
        return;
    }

    try {
        if (currentUserRole === 'master') {
            // Master can delete directly
            if(confirm(language === 'zh' ? '确定要永久删除该点位吗？' : 'Permanently delete this location?')) {
                await deleteLocation(id);
            }
        } else {
            // Manager must request deletion
            if(confirm(language === 'zh' 
                ? '子管理员无法直接删除点位。点击“确定”将向主管理员提交删除申请。' 
                : 'Managers cannot delete directly. Click OK to request approval from Master Admin.')) {
                
                if (currentManager) {
                    console.log("Submitting deletion request for", id);
                    await requestLocationDeletion(id, loc.nameZh, currentManager.id, currentManager.name, currentManager.departmentName);
                    alert(language === 'zh' ? '申请已提交，等待主管理员审核。' : 'Request sent to Master Admin.');
                } else {
                    console.error("Cannot request deletion: Current Manager is undefined");
                    alert(language === 'zh' ? '错误：未找到当前管理员信息' : 'Error: Manager info missing');
                }
            }
        }
    } catch (error) {
        console.error("Delete operation failed:", error);
        alert(language === 'zh' 
            ? '操作失败。请检查网络连接或权限设置。' 
            : 'Operation failed. Please check network or permissions.');
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
    const targetId = getActiveManagerId();
    if (targetId && confirm(t.resetConfirm)) {
      await clearAllLogs(targetId);
    }
  }

  const handleRefreshData = async () => {
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
          cleaners={cleanersList}
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
                        onClick={() => {
                          setView(currentUserRole === 'master' ? 'master-dashboard' : 'dashboard');
                          if (currentUserRole === 'master') setMasterSelectedManagerId(null);
                        }}
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
                      {(currentUserRole === 'manager' || (currentUserRole === 'master' && masterSelectedManagerId)) && (
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
                  onUpdateManager={handleUpdateManager}
                  onDeleteManager={handleDeleteManager}
                  language={language}
                  // New Props for Request Handling
                  deletionRequests={deletionRequests}
                  onResolveRequest={handleResolveDeletionRequest}
                  // Props for Dashboard view within Master
                  selectedManagerId={masterSelectedManagerId}
                  onSelectManager={setMasterSelectedManagerId}
                  locations={locationsList}
                  logs={logs}
                  cleaners={cleanersList}
                  onUpdateCleaner={handleUpdateCleaner}
                  onUpdateLocation={handleUpdateLocation}
                  onAddCleaner={handleAddCleaner}
                  onDeleteCleaner={handleDeleteCleaner}
                  onAddLocation={handleAddLocation}
                  onDeleteLocation={handleDeleteLocation}
                  onRefresh={handleRefreshData}
                  isCloudMode={isCloudMode}
                  isLoading={isLoading} // PASS LOADING STATE
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
                isLoading={isLoading} // PASS LOADING STATE
              />
            )}
            
            {/* PRINT VIEW (Shared) */}
            {((currentUserRole === 'manager' && view === 'qr-print') || (currentUserRole === 'master' && view === 'qr-print')) && (
              <QRCodeGenerator locations={locationsList} language={language} />
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
    </div>
  );
};

export default App;

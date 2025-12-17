
import React, { useState } from 'react';
import { Location, CleaningLog, Cleaner, Language } from '../types';
import { analyzeCleaningData } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Sparkles, 
  RefreshCw,
  Search,
  Users,
  Edit,
  Save,
  RotateCw,
  Target,
  Wifi,
  Plus,
  Trash2,
  X,
  Trophy,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  MapPin,
  Building2,
  ClipboardCheck,
  Zap
} from 'lucide-react';

interface DashboardProps {
  locations: Location[];
  logs: CleaningLog[];
  cleaners: Cleaner[];
  language: Language;
  onUpdateCleaner: (updatedCleaner: Cleaner) => void;
  onUpdateLocation: (updatedLocation: Location) => void; 
  onAddCleaner: (name: string, password: string) => void;
  onDeleteCleaner: (id: string) => void;
  onAddLocation: (nameZh: string, nameEn: string, zone: string, target: number) => void;
  onDeleteLocation: (id: string) => void;
  onRefresh: () => void;
  isCloudMode: boolean;
  departmentName?: string; 
}

const Dashboard: React.FC<DashboardProps> = ({ 
  locations, 
  logs, 
  cleaners, 
  language, 
  onUpdateCleaner, 
  onUpdateLocation,
  onAddCleaner,
  onDeleteCleaner,
  onAddLocation,
  onDeleteLocation,
  onRefresh,
  isCloudMode,
  departmentName
}) => {
  const t = TRANSLATIONS[language];
  
  // -- Date Filter State --
  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  // -- Existing State --
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  // -- Expansion State --
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);

  // Cleaner Edit State
  const [editingCleaner, setEditingCleaner] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Location Edit State
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editTargetFreq, setEditTargetFreq] = useState<string>('');
  
  // Adding States
  const [isAddingCleaner, setIsAddingCleaner] = useState(false);
  const [newCleanerName, setNewCleanerName] = useState('');
  const [newCleanerPassword, setNewCleanerPassword] = useState('');

  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocNameZh, setNewLocNameZh] = useState('');
  const [newLocNameEn, setNewLocNameEn] = useState('');
  const [newLocZone, setNewLocZone] = useState('');
  const [newLocTarget, setNewLocTarget] = useState('20');

  // -- Date Logic Calculations --
  const startTs = new Date(startDate).setHours(0, 0, 0, 0);
  const endTs = new Date(endDate).setHours(23, 59, 59, 999);
  
  const oneDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.max(1, Math.round((endTs - startTs) / oneDay));

  // Filter logs by date range
  const filteredLogs = logs.filter(l => l.timestamp >= startTs && l.timestamp <= endTs);

  const locationStats = locations.map(loc => {
    const locLogs = filteredLogs.filter(l => l.locationId === loc.id);
    const count = locLogs.length;
    
    const periodTarget = loc.targetDailyFrequency * daysDiff;
    const percentage = periodTarget > 0 ? Math.round((count / periodTarget) * 100) : 0;
    
    const isOverachieved = count > periodTarget;
    const isAtRisk = percentage < 80; 
    
    const lastClean = locLogs.length > 0 ? Math.max(...locLogs.map(l => l.timestamp)) : 0;
    const displayName = language === 'zh' ? loc.nameZh : loc.nameEn;

    return {
      ...loc,
      displayName,
      count,
      periodTarget,
      percentage,
      isAtRisk,
      isOverachieved,
      lastClean,
      logs: locLogs.sort((a, b) => b.timestamp - a.timestamp) // Sort specifically for detail view
    };
  });

  // Summary Metrics
  const totalTarget = locationStats.reduce((acc, curr) => acc + curr.periodTarget, 0);
  const totalCleaned = filteredLogs.length;
  const overallProgress = totalTarget > 0 ? Math.round((totalCleaned / totalTarget) * 100) : 0;
  const locationsBehindCount = locationStats.filter(l => l.isAtRisk && l.periodTarget > 0).length;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeCleaningData(filteredLogs, locations, language);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleStartEdit = (c: Cleaner) => {
    setEditingCleaner(c.id);
    setEditName(c.name);
    setEditPassword(c.password || '');
  };

  const handleSaveEdit = (c: Cleaner) => {
    if (editName.trim() && editPassword.trim()) {
      onUpdateCleaner({ ...c, name: editName, password: editPassword });
      setEditingCleaner(null);
    }
  };

  const handleConfirmAddCleaner = () => {
    if (newCleanerName.trim() && newCleanerPassword.trim()) {
      onAddCleaner(newCleanerName, newCleanerPassword);
      setNewCleanerName('');
      setNewCleanerPassword('');
      setIsAddingCleaner(false);
    }
  };

  const handleConfirmAddLocation = () => {
    if (newLocNameZh.trim() && newLocTarget) {
      onAddLocation(newLocNameZh, newLocNameEn || newLocNameZh, newLocZone || 'General', parseInt(newLocTarget));
      setNewLocNameZh('');
      setNewLocNameEn('');
      setNewLocZone('');
      setNewLocTarget('20');
      setIsAddingLocation(false);
    }
  }

  const handleStartEditLocation = (e: React.MouseEvent, loc: Location) => {
    e.stopPropagation(); // Prevent row toggle
    setEditingLocationId(loc.id);
    setEditTargetFreq(loc.targetDailyFrequency.toString());
  }

  const handleSaveLocation = (loc: Location) => {
    const newTarget = parseInt(editTargetFreq);
    if (!isNaN(newTarget) && newTarget > 0) {
      onUpdateLocation({ ...loc, targetDailyFrequency: newTarget });
    }
    setEditingLocationId(null);
  }
  
  const handleResetDate = () => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
  }

  const toggleRow = (id: string) => {
    setExpandedLocationId(prev => prev === id ? null : id);
  };

  const filteredLocations = locationStats.filter(l => 
    l.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
    l.zone.toLowerCase().includes(filterText.toLowerCase())
  );

  // Helper for status badge
  const renderStatusBadge = (loc: any) => {
    if (loc.isOverachieved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
           <Trophy size={12} /> {t.overachieved}
        </span>
      );
    }
    if (loc.isAtRisk) {
      return (
         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
            <AlertTriangle size={12} /> {t.behind}
         </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
         <CheckCircle size={12} /> {t.onTrack}
      </span>
    );
  };

  // Helper for expanded log view
  const renderLogDetails = (loc: any) => (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 animate-fade-in relative">
       <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <History size={14} />
              {language === 'zh' ? '打卡记录明细' : 'Cleaning History Log'}
           </div>
       </div>
       
       {loc.logs.length > 0 ? (
         <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full text-xs">
             <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">{language === 'zh' ? '时间' : 'Time'}</th>
                  <th className="px-3 py-2 text-left">{language === 'zh' ? '保洁员' : 'Cleaner'}</th>
                  <th className="px-3 py-2 text-right">{language === 'zh' ? '状态' : 'Status'}</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {loc.logs.map((log: any) => {
                  const cleaner = cleaners.find(c => c.id === log.cleanerId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                         {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         {daysDiff > 1 && <span className="text-[10px] text-slate-400 block sm:inline sm:ml-1">{new Date(log.timestamp).getMonth()+1}/{new Date(log.timestamp).getDate()}</span>}
                      </td>
                      <td className="px-3 py-2.5 flex items-center gap-2">
                         {cleaner ? (
                           <>
                             <img src={cleaner.avatar} className="w-5 h-5 rounded-full" />
                             <span className="font-medium text-slate-700">{cleaner.name}</span>
                           </>
                         ) : (
                           <span className="text-slate-400">Unknown</span>
                         )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <CheckCircle size={10} /> Ok
                        </span>
                      </td>
                    </tr>
                  )
                })}
             </tbody>
           </table>
         </div>
       ) : (
         <div className="text-center py-6 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg">
            {language === 'zh' ? '该时间段内无打卡记录' : 'No records found for this period.'}
         </div>
       )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {departmentName && (
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 text-white p-6 rounded-2xl shadow-lg mb-6 flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold flex items-center gap-2">
               <Building2 className="text-white/80" />
               {departmentName}
             </h1>
             <p className="text-white/60 text-sm mt-1">Department Dashboard</p>
           </div>
           <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
             <div className="text-xs text-white/60 uppercase font-bold">Total Locations</div>
             <div className="text-2xl font-bold">{locations.length}</div>
           </div>
        </div>
      )}
      
      {/* --- Filter Bar --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full">
            <div className="flex items-center gap-2 text-slate-700 font-bold mb-2 md:mb-0">
               <Calendar size={20} className="text-brand-500" />
               <span>{t.dateRange}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center">
               <div className="flex flex-col">
                  <label className="text-[10px] text-slate-400 font-medium uppercase mb-1">{t.startDate}</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
               </div>
               <div className="flex flex-col">
                  <label className="text-[10px] text-slate-400 font-medium uppercase mb-1">{t.endDate}</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
               </div>
            </div>

            <div className="flex items-center gap-2 mt-2 md:mt-0">
               {daysDiff > 1 && (
                 <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100 whitespace-nowrap">
                   {daysDiff} {t.days}
                 </span>
               )}
               <button 
                 onClick={handleResetDate}
                 className="text-xs text-slate-500 hover:text-brand-600 underline whitespace-nowrap ml-auto md:ml-0"
               >
                 {t.resetDate}
               </button>
            </div>
         </div>

         <div className="flex items-center gap-2 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-50 mt-2 md:mt-0 w-full md:w-auto">
            <button 
              onClick={onRefresh}
              className="w-full md:w-auto flex items-center justify-center gap-1 text-sm text-brand-600 bg-brand-50 hover:bg-brand-100 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RotateCw size={14} />
              <span>{language === 'zh' ? '刷新' : 'Refresh'}</span>
            </button>
         </div>
      </div>

      {/* --- NEW: Stats Overview Grid --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card: Total Target */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
           <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
             <Target size={24} />
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'zh' ? '目标打卡数' : 'Total Target'}</p>
             <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalTarget}</h3>
             <p className="text-[10px] text-slate-400 mt-0.5">{daysDiff} {t.days} total</p>
           </div>
        </div>

        {/* Card: Completed Tasks */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
           <div className="p-3 bg-green-50 text-green-600 rounded-xl">
             <ClipboardCheck size={24} />
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'zh' ? '已完成打卡' : 'Completed'}</p>
             <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCleaned}</h3>
             <p className="text-[10px] text-green-600 mt-0.5 font-bold flex items-center gap-1">
               <Zap size={10} /> {language === 'zh' ? '实时更新中' : 'Live Data'}
             </p>
           </div>
        </div>

        {/* Card: Compliance Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
           <div className={`p-3 rounded-xl ${overallProgress >= 90 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}`}>
             <BarChart3 size={24} />
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.dailyCompliance}</p>
             <h3 className={`text-2xl font-bold mt-1 ${overallProgress < 70 ? 'text-red-500' : 'text-slate-800'}`}>
               {overallProgress}%
             </h3>
             <div className="w-20 bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${overallProgress < 70 ? 'bg-red-500' : 'bg-brand-500'}`} 
                  style={{ width: `${Math.min(overallProgress, 100)}%` }}
                />
             </div>
           </div>
        </div>

        {/* Card: Issues/Behind */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
           <div className={`p-3 rounded-xl ${locationsBehindCount > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
             <AlertTriangle size={24} />
           </div>
           <div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.activeIssues}</p>
             <h3 className={`text-2xl font-bold mt-1 ${locationsBehindCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
               {locationsBehindCount}
             </h3>
             <p className="text-[10px] text-slate-400 mt-0.5">{language === 'zh' ? '个点位落后' : 'locs at risk'}</p>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Location List */}
        <div className="lg:col-span-2">
          
          {/* Header & Search */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-500" />
                  {t.liveStatus}
                </h2>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder={t.search}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={() => setIsAddingLocation(!isAddingLocation)}
                    className="p-2 bg-brand-50 text-brand-600 rounded-lg border border-brand-100 hover:bg-brand-100"
                    title="Add Location"
                  >
                    {isAddingLocation ? <X size={20} /> : <Plus size={20} />}
                  </button>
                </div>
             </div>

             {/* Add Location Form */}
             {isAddingLocation && (
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 animate-fade-in">
                 <h3 className="font-bold text-sm text-slate-700 mb-3">{language === 'zh' ? '添加新点位' : 'Add New Location'}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                   <input 
                     placeholder={language === 'zh' ? '点位名称 (如: 卫生间)' : 'Location Name'}
                     className="p-2 text-sm border rounded focus:ring-2 focus:ring-brand-500"
                     value={newLocNameZh}
                     onChange={e => setNewLocNameZh(e.target.value)}
                   />
                    <input 
                     placeholder={language === 'zh' ? '区域 (如: 1楼)' : 'Zone'}
                     className="p-2 text-sm border rounded focus:ring-2 focus:ring-brand-500"
                     value={newLocZone}
                     onChange={e => setNewLocZone(e.target.value)}
                   />
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500 whitespace-nowrap">{language === 'zh' ? '日目标:' : 'Daily Target:'}</span>
                     <input 
                       type="number"
                       className="p-2 text-sm border rounded w-20 focus:ring-2 focus:ring-brand-500"
                       value={newLocTarget}
                       onChange={e => setNewLocTarget(e.target.value)}
                     />
                   </div>
                 </div>
                 <div className="flex justify-end">
                   <button 
                     onClick={handleConfirmAddLocation}
                     className="bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded hover:bg-brand-700"
                   >
                     {language === 'zh' ? '确认添加' : 'Add Location'}
                   </button>
                 </div>
               </div>
             )}

            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-100">
                    <tr>
                      <th className="px-6 py-4">{t.location}</th>
                      <th className="px-6 py-4">{t.zone}</th>
                      <th className="px-6 py-4">{t.status}</th>
                      <th className="px-6 py-4">{t.progress}</th>
                      <th className="px-6 py-4">{t.lastCleaned}</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLocations.map((loc) => (
                      <React.Fragment key={loc.id}>
                        <tr 
                          onClick={() => toggleRow(loc.id)} 
                          className={`transition-colors cursor-pointer group ${expandedLocationId === loc.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                             {loc.displayName}
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                              {loc.zone}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {renderStatusBadge(loc)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      loc.isOverachieved ? 'bg-indigo-500' : 
                                      loc.isAtRisk ? 'bg-red-500' : 'bg-brand-500'
                                    }`} 
                                    style={{ width: `${Math.min(loc.percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                  {loc.count} / {loc.periodTarget}
                                  
                                  {daysDiff === 1 && (
                                      editingLocationId === loc.id ? (
                                          <span className="inline-flex items-center ml-1" onClick={e => e.stopPropagation()}>
                                          <input 
                                              type="number" 
                                              className="w-12 h-6 px-1 text-xs border border-brand-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500"
                                              value={editTargetFreq}
                                              onChange={(e) => setEditTargetFreq(e.target.value)}
                                              autoFocus
                                              onBlur={() => handleSaveLocation(loc)}
                                              onKeyDown={(e) => e.key === 'Enter' && handleSaveLocation(loc)}
                                          />
                                          </span>
                                      ) : (
                                          <span 
                                          className="ml-1 px-1 py-0.5 hover:bg-slate-100 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors opacity-50 hover:opacity-100"
                                          onClick={(e) => handleStartEditLocation(e, loc)}
                                          title={t.editTarget}
                                          >
                                          <Edit size={10} />
                                          </span>
                                      )
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500">
                            {loc.lastClean > 0 ? (
                               <span className="flex items-center gap-1" title={new Date(loc.lastClean).toLocaleString()}>
                                 <Clock size={12} />
                                 {new Date(loc.lastClean).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </span>
                            ) : (
                              <span className="text-slate-400 italic">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteLocation(loc.id);
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
                              title={language === 'zh' ? '删除' : 'Delete'}
                            >
                              <Trash2 size={18} />
                            </button>
                            <div className="p-2 text-slate-300 group-hover:text-slate-500">
                              {expandedLocationId === loc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Detail View Desktop */}
                        {expandedLocationId === loc.id && (
                          <tr className="bg-slate-50 border-b border-slate-100 shadow-inner">
                            <td colSpan={6} className="p-0">
                               {renderLogDetails(loc)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {filteredLocations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                          {language === 'zh' ? '暂无点位，请点击右上角 + 添加' : 'No locations found. Click + to add.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="md:hidden space-y-3 mt-4">
              {filteredLocations.map(loc => (
                <div 
                  key={loc.id} 
                  className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-all ${
                    expandedLocationId === loc.id ? 'ring-2 ring-brand-100' : ''
                  }`}
                  onClick={() => toggleRow(loc.id)}
                >
                  <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="pr-2">
                            <h3 className="font-bold text-slate-800 text-sm leading-tight">{loc.displayName}</h3>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                              {loc.zone}
                            </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                            {renderStatusBadge(loc)}
                            <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteLocation(loc.id);
                                }}
                                className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-red-500 hover:border-red-200 shadow-sm z-10"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{t.progress}</span>
                            <span className="font-mono">{loc.count} / {loc.periodTarget}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                loc.isOverachieved ? 'bg-indigo-500' : 
                                loc.isAtRisk ? 'bg-red-500' : 'bg-brand-500'
                              }`} 
                              style={{ width: `${Math.min(loc.percentage, 100)}%` }}
                            />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {loc.lastClean > 0 ? (
                              <span>
                                {new Date(loc.lastClean).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            ) : '--:--'}
                        </div>
                        {expandedLocationId === loc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                  </div>

                  {/* Expanded Details Mobile */}
                  {expandedLocationId === loc.id && renderLogDetails(loc)}
                </div>
              ))}
               {filteredLocations.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic">
                    {language === 'zh' ? '暂无点位，请点击右上角 + 添加' : 'No locations found. Click + to add.'}
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Team Management & AI */}
        <div className="space-y-6">

          {/* Team Management */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-500" />
                {t.teamManagement}
              </h2>
              <button 
                onClick={() => setIsAddingCleaner(!isAddingCleaner)}
                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-100"
                title="Add Cleaner"
              >
                {isAddingCleaner ? <X size={20} className="text-slate-400" /> : <Plus size={20} />}
              </button>
            </div>

            {/* Add New Cleaner Form */}
            {isAddingCleaner && (
              <div className="bg-brand-50 p-3 rounded-lg mb-4 border border-brand-100 animate-fade-in">
                <p className="text-xs font-bold text-brand-700 mb-2">
                  {language === 'zh' ? '添加新保洁员' : 'Add New Cleaner'}
                </p>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder={language === 'zh' ? '姓名' : 'Name'}
                    className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newCleanerName}
                    onChange={e => setNewCleanerName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder={language === 'zh' ? '设置密码' : 'Set Password'}
                    className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newCleanerPassword}
                    onChange={e => setNewCleanerPassword(e.target.value)}
                  />
                  <button 
                    onClick={handleConfirmAddCleaner}
                    className="w-full bg-brand-600 text-white text-xs font-bold py-2 rounded hover:bg-brand-700"
                  >
                    {language === 'zh' ? '确认添加' : 'Confirm Add'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {cleaners.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group">
                  {editingCleaner === c.id ? (
                    // EDIT MODE
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 text-xs p-1.5 border rounded"
                          placeholder="Name"
                        />
                        <input 
                          type="text" 
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-20 text-xs p-1.5 border rounded"
                          placeholder="Pass"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingCleaner(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
                        <button onClick={() => handleSaveEdit(c)} className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center gap-1">
                          <Save size={12} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // VIEW MODE
                    <>
                      <div className="flex items-center gap-3">
                        <img src={c.avatar} className="w-8 h-8 rounded-full bg-white border border-slate-200" alt={c.name} />
                        <div className="text-sm">
                          <p className="font-bold text-slate-700">{c.name}</p>
                          <p className="text-xs text-slate-400">Pass: {c.password}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleStartEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteCleaner(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              {cleaners.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-xs italic">
                  {language === 'zh' ? '暂无保洁员' : 'No cleaners found.'}
                </div>
              )}
            </div>
          </div>
          
          {/* AI Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-brand-900 rounded-xl shadow-lg p-6 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Sparkles size={120} />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Sparkles className="text-yellow-300" />
                {t.geminiTitle}
              </h2>
              
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20 min-h-[160px] text-sm leading-relaxed">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-indigo-200">
                    <RefreshCw className="animate-spin w-6 h-6" />
                    {t.analyzing}
                  </div>
                ) : analysis ? (
                  <div className="prose prose-invert prose-sm max-h-60 overflow-y-auto custom-scrollbar">
                    {analysis.split('\n').map((line, i) => (
                      <p key={i} className="mb-2">{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-200 text-center py-8">
                    {t.analysisPrompt}
                  </p>
                )}
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-4 bg-white text-brand-900 font-bold py-2.5 rounded-lg hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
              >
                {isAnalyzing ? 'Processing...' : t.runAnalysis}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

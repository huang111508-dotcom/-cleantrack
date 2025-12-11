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
  Trophy // New icon for Overachieved
} from 'lucide-react';

interface DashboardProps {
  locations: Location[];
  logs: CleaningLog[];
  cleaners: Cleaner[];
  language: Language;
  onUpdateCleaner: (updatedCleaner: Cleaner) => void;
  onUpdateLocation: (updatedLocation: Location) => void; // New prop
  onAddCleaner: (name: string, password: string) => void;
  onDeleteCleaner: (id: string) => void;
  onRefresh: () => void;
  isCloudMode: boolean;
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
  onRefresh,
  isCloudMode
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterText, setFilterText] = useState('');
  
  // Cleaner Edit State
  const [editingCleaner, setEditingCleaner] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Location Target Edit State (New)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editTargetFreq, setEditTargetFreq] = useState<string>('');

  // Add Cleaner State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const t = TRANSLATIONS[language];

  // Calculate statistics
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaysLogs = logs.filter(l => l.timestamp >= todayStart);

  const locationStats = locations.map(loc => {
    const locLogs = todaysLogs.filter(l => l.locationId === loc.id);
    const count = locLogs.length;
    // Cap percentage visual at 100 for the bar, but logic allows > 100
    const percentage = Math.round((count / loc.targetDailyFrequency) * 100);
    
    // Status Logic
    const isOverachieved = count > loc.targetDailyFrequency;
    const isAtRisk = percentage < 80 && !isOverachieved; 
    
    const lastClean = locLogs.length > 0 ? Math.max(...locLogs.map(l => l.timestamp)) : 0;
    
    // Select name based on language
    const displayName = language === 'zh' ? loc.nameZh : loc.nameEn;

    return {
      ...loc,
      displayName,
      count,
      percentage,
      isAtRisk,
      isOverachieved,
      lastClean
    };
  });

  const totalTarget = locations.reduce((acc, curr) => acc + curr.targetDailyFrequency, 0);
  const totalCleaned = todaysLogs.length;
  const overallProgress = Math.round((totalCleaned / totalTarget) * 100);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeCleaningData(logs, locations, language);
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

  const handleConfirmAdd = () => {
    if (newName.trim() && newPassword.trim()) {
      onAddCleaner(newName, newPassword);
      setNewName('');
      setNewPassword('');
      setIsAdding(false);
    }
  };

  // Location Edit Handlers
  const handleStartEditLocation = (loc: Location) => {
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

  const filteredLocations = locationStats.filter(l => 
    l.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
    l.zone.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-end lg:hidden">
         <button 
           onClick={onRefresh}
           className="flex items-center gap-1 text-sm text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full font-medium"
         >
           <RotateCw size={14} />
           {language === 'zh' ? '刷新数据' : 'Refresh'}
         </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Compliance */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t.dailyCompliance}</p>
              <h3 className="text-2xl font-bold text-slate-800">{overallProgress}%</h3>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 rounded-full">
              <CheckCircle size={24} />
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
            <div 
              className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(overallProgress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Issues */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t.activeIssues}</p>
              <h3 className="text-2xl font-bold text-red-500">
                {locationStats.filter(l => l.isAtRisk).length}
              </h3>
            </div>
            <div className="p-3 bg-red-50 text-red-500 rounded-full">
              <AlertTriangle size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
             {language === 'zh' ? '进度低于80%的点位' : 'Locations below 80% target'}
          </p>
        </div>

        {/* Card 3: Total Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                {language === 'zh' ? '今日清洁进度' : 'Today\'s Progress'}
              </p>
              <h3 className="text-2xl font-bold text-slate-800 flex items-baseline gap-1">
                <span>{totalCleaned}</span>
                <span className="text-lg text-slate-400 font-normal">/ {totalTarget}</span>
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-full">
              <Target size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {language === 'zh' 
              ? `剩余任务: ${Math.max(0, totalTarget - totalCleaned)} 次` 
              : `Remaining: ${Math.max(0, totalTarget - totalCleaned)} tasks`}
          </p>
        </div>

        {/* Card 4: System Status */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">
                {language === 'zh' ? '系统状态' : 'System Status'}
              </p>
              <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
                 {language === 'zh' ? '在线' : 'Online'}
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
              </h3>
            </div>
            <div className="p-3 rounded-full bg-green-50 text-green-600">
               <Wifi size={24} />
            </div>
          </div>
           <div className="flex items-center justify-between mt-2">
             <p className="text-xs text-slate-400">
               {language === 'zh' ? '云端数据实时同步中' : 'Data syncing with cloud'}
             </p>
             <span className="text-[10px] text-brand-600 font-mono bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">v3.0 LIVE</span>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Location List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              {t.liveStatus}
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
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
                onClick={onRefresh}
                className="hidden sm:flex p-2 text-slate-400 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-colors"
                title={language === 'zh' ? '刷新数据' : 'Refresh Data'}
              >
                <RotateCw size={18} />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">{t.location}</th>
                  <th className="px-6 py-4">{t.zone}</th>
                  <th className="px-6 py-4">{t.status}</th>
                  <th className="px-6 py-4">{t.progress}</th>
                  <th className="px-6 py-4">{t.lastCleaned}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{loc.displayName}</td>
                    <td className="px-6 py-4 text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                        {loc.zone}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {loc.isOverachieved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                           <Trophy size={12} /> {t.overachieved}
                        </span>
                      ) : loc.isAtRisk ? (
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                            <AlertTriangle size={12} /> {t.behind}
                         </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                           <CheckCircle size={12} /> {t.onTrack}
                        </span>
                      )}
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
                          <span className="text-xs text-slate-500 font-medium">{loc.count} / 
                            {/* Editable Target */}
                            {editingLocationId === loc.id ? (
                                <span className="inline-flex items-center ml-1">
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
                                  className="ml-1 px-1 py-0.5 hover:bg-slate-100 rounded cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                                  onClick={() => handleStartEditLocation(loc)}
                                  title={t.editTarget}
                                >
                                   {loc.targetDailyFrequency}
                                </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {loc.lastClean > 0 ? (
                         <span className="flex items-center gap-1">
                           <Clock size={12} />
                           {new Date(loc.lastClean).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                      ) : (
                        <span className="text-slate-400 italic">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                onClick={() => setIsAdding(!isAdding)}
                className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-100"
                title="Add Cleaner"
              >
                {isAdding ? <X size={20} className="text-slate-400" /> : <Plus size={20} />}
              </button>
            </div>

            {/* Add New Cleaner Form */}
            {isAdding && (
              <div className="bg-brand-50 p-3 rounded-lg mb-4 border border-brand-100 animate-fade-in">
                <p className="text-xs font-bold text-brand-700 mb-2">
                  {language === 'zh' ? '添加新保洁员' : 'Add New Cleaner'}
                </p>
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder={language === 'zh' ? '姓名' : 'Name'}
                    className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder={language === 'zh' ? '设置密码' : 'Set Password'}
                    className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <button 
                    onClick={handleConfirmAdd}
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
                  No cleaners found. Click + to add.
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
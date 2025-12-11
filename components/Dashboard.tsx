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
  Cloud,
  Target,
  Wifi
} from 'lucide-react';

interface DashboardProps {
  locations: Location[];
  logs: CleaningLog[];
  cleaners: Cleaner[];
  language: Language;
  onUpdateCleaner: (updatedCleaner: Cleaner) => void;
  onRefresh: () => void;
  isCloudMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  locations, 
  logs, 
  cleaners, 
  language, 
  onUpdateCleaner, 
  onRefresh,
  isCloudMode
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [editingCleaner, setEditingCleaner] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const t = TRANSLATIONS[language];

  // Calculate statistics
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todaysLogs = logs.filter(l => l.timestamp >= todayStart);

  const locationStats = locations.map(loc => {
    const locLogs = todaysLogs.filter(l => l.locationId === loc.id);
    const count = locLogs.length;
    const percentage = Math.min(100, Math.round((count / loc.targetDailyFrequency) * 100));
    const isAtRisk = percentage < 80; // Simple threshold
    const lastClean = locLogs.length > 0 ? Math.max(...locLogs.map(l => l.timestamp)) : 0;
    
    // Select name based on language
    const displayName = language === 'zh' ? loc.nameZh : loc.nameEn;

    return {
      ...loc,
      displayName,
      count,
      percentage,
      isAtRisk,
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

  const handleSavePassword = (cleaner: Cleaner) => {
    if (newPassword.trim()) {
      onUpdateCleaner({ ...cleaner, password: newPassword });
      setEditingCleaner(null);
      setNewPassword('');
    }
  };

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
              style={{ width: `${overallProgress}%` }}
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

        {/* Card 4: System Status (Updated visual style to White Theme) */}
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
             <span className="text-[10px] text-slate-300 font-mono border border-slate-100 px-1 rounded">LIVE</span>
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
                      {loc.isAtRisk ? (
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
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${loc.isAtRisk ? 'bg-red-500' : 'bg-brand-500'}`} 
                            style={{ width: `${loc.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{loc.count}/{loc.targetDailyFrequency}</span>
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
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand-500" />
              {t.teamManagement}
            </h2>
            <div className="space-y-3">
              {cleaners.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={c.avatar} className="w-8 h-8 rounded-full bg-white" alt={c.name} />
                    <div className="text-sm">
                      <p className="font-bold text-slate-700">{c.name}</p>
                      <p className="text-xs text-slate-400">Pass: {editingCleaner === c.id ? '****' : c.password}</p>
                    </div>
                  </div>
                  {editingCleaner === c.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Pass"
                        className="w-24 text-xs p-1 border rounded"
                      />
                      <button 
                        onClick={() => handleSavePassword(c)}
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingCleaner(c.id); setNewPassword(c.password || ''); }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-white rounded transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                  )}
                </div>
              ))}
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
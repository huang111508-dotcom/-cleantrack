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
  Search
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  locations: Location[];
  logs: CleaningLog[];
  cleaners: Cleaner[];
  language: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ locations, logs, cleaners, language }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterText, setFilterText] = useState('');

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

  const filteredLocations = locationStats.filter(l => 
    l.displayName.toLowerCase().includes(filterText.toLowerCase()) ||
    l.zone.toLowerCase().includes(filterText.toLowerCase())
  );

  const pieData = [
    { name: t.cleaned, value: totalCleaned },
    { name: 'Remaining', value: Math.max(0, totalTarget - totalCleaned) },
  ];
  const COLORS = ['#0ea5e9', '#e2e8f0'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{t.totalCleanings}</p>
              <h3 className="text-2xl font-bold text-slate-800">{totalCleaned}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-full">
              <RefreshCw size={24} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {language === 'zh' ? `今日目标: ${totalTarget} 次` : `Of ${totalTarget} required today`}
          </p>
        </div>

         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
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

        {/* Right Column: AI Analysis & Recent Activity */}
        <div className="space-y-6">
          
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

          {/* Recent Logs Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
             <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">{t.recentActivity}</h3>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {todaysLogs.slice(0, 8).map(log => {
                  const cleaner = cleaners.find(c => c.id === log.cleanerId);
                  const location = locations.find(l => l.id === log.locationId);
                  const locName = language === 'zh' ? location?.nameZh : location?.nameEn;
                  
                  return (
                    <div key={log.id} className="flex gap-3 items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                      <img 
                        src={cleaner?.avatar} 
                        alt={cleaner?.name} 
                        className="w-8 h-8 rounded-full border border-slate-200"
                      />
                      <div>
                         <p className="text-sm font-medium text-slate-800">
                           {cleaner?.name} <span className="text-slate-400 font-normal">{t.cleaned}</span>
                         </p>
                         <p className="text-xs text-brand-600 font-medium">
                           {locName}
                         </p>
                         <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(log.timestamp).toLocaleTimeString()}
                         </p>
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
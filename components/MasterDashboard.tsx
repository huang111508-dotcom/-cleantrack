
import React, { useState, useEffect } from 'react';
import { Manager, Language, CleaningLog, Cleaner, Location } from '../types';
import { TRANSLATIONS } from '../constants';
import { getLegacyDataStats, migrateLegacyData } from '../services/firebase';
import Dashboard from './Dashboard';
import { Users, Building2, Plus, Trash2, Key, Database, ArrowRight, RefreshCw, AlertCircle, Edit, Save, X, Eye, ChevronLeft } from 'lucide-react';

interface MasterDashboardProps {
  managers: Manager[];
  onAddManager: (name: string, dept: string, pass: string) => void;
  onUpdateManager: (manager: Manager) => void;
  onDeleteManager: (id: string) => void;
  language: Language;

  // New props for Data Monitoring
  selectedManagerId: string | null;
  onSelectManager: (id: string | null) => void;
  
  // Dashboard Props (passed through)
  locations: Location[];
  logs: CleaningLog[];
  cleaners: Cleaner[];
  onUpdateCleaner: (updatedCleaner: Cleaner) => void;
  onUpdateLocation: (updatedLocation: Location) => void; 
  onAddCleaner: (name: string, password: string) => void;
  onDeleteCleaner: (id: string) => void;
  onAddLocation: (nameZh: string, nameEn: string, zone: string, target: number) => void;
  onDeleteLocation: (id: string) => void;
  onRefresh: () => void;
  isCloudMode: boolean;
}

const MasterDashboard: React.FC<MasterDashboardProps> = ({ 
  managers, 
  onAddManager, 
  onUpdateManager,
  onDeleteManager,
  language,
  selectedManagerId,
  onSelectManager,
  ...dashboardProps // Pass remaining props to Dashboard
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newPass, setNewPass] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editPass, setEditPass] = useState('');

  // Migration State
  const [legacyStats, setLegacyStats] = useState({ locations: 0, cleaners: 0, logs: 0 });
  const [migrationTargetId, setMigrationTargetId] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState('');

  const fetchStats = async () => {
    const stats = await getLegacyDataStats();
    setLegacyStats(stats);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAdd = () => {
    if (newName && newDept && newPass) {
      onAddManager(newName, newDept, newPass);
      setNewName('');
      setNewDept('');
      setNewPass('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (mgr: Manager) => {
    setEditingId(mgr.id);
    setEditName(mgr.name);
    setEditDept(mgr.departmentName);
    setEditPass(mgr.password || '');
  };

  const handleSaveEdit = (mgr: Manager) => {
    if (editName && editDept && editPass) {
      onUpdateManager({
        ...mgr,
        name: editName,
        departmentName: editDept,
        password: editPass
      });
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleMigration = async () => {
    if (!migrationTargetId) return;
    if (confirm(language === 'zh' ? '确定将所有旧数据转移到选中的部门吗？此操作不可逆。' : 'Are you sure you want to move all legacy data to this department?')) {
      setIsMigrating(true);
      setMigrationMsg(language === 'zh' ? '正在迁移数据...' : 'Migrating data...');
      
      const success = await migrateLegacyData(migrationTargetId);
      
      if (success) {
        setMigrationMsg(language === 'zh' ? '迁移成功！' : 'Migration successful!');
        fetchStats();
        setTimeout(() => setMigrationMsg(''), 3000);
      } else {
        setMigrationMsg(language === 'zh' ? '迁移失败，请重试。' : 'Migration failed.');
      }
      setIsMigrating(false);
    }
  };

  const hasLegacyData = legacyStats.locations > 0 || legacyStats.cleaners > 0 || legacyStats.logs > 0;

  // --- VIEW MODE: DETAILED DEPARTMENT DASHBOARD ---
  if (selectedManagerId) {
    const selectedManager = managers.find(m => m.id === selectedManagerId);
    return (
      <div className="animate-fade-in">
        <div className="mb-4">
          <button 
            onClick={() => onSelectManager(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium transition-colors"
          >
            <ChevronLeft size={20} />
            {language === 'zh' ? '返回部门列表' : 'Back to Department List'}
          </button>
        </div>
        
        {/* Render the standard Dashboard with Master privileges */}
        <Dashboard 
          {...dashboardProps}
          departmentName={selectedManager?.departmentName || 'Unknown Department'}
          language={language}
        />
      </div>
    );
  }

  // --- VIEW MODE: MANAGER LIST (ADMIN) ---
  return (
    <div className="max-w-5xl mx-auto p-4 animate-fade-in pb-20">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="text-brand-400" />
              {language === 'zh' ? '主管理员控制台' : 'Master Admin Console'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {language === 'zh' ? '管理各部门及其管理员账号' : 'Manage departments and sub-admin accounts'}
            </p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            {language === 'zh' ? '新建部门' : 'New Department'}
          </button>
        </div>

        {isAdding && (
          <div className="p-6 bg-slate-50 border-b border-slate-100 animate-fade-in">
            <h3 className="font-bold text-slate-700 mb-4">
              {language === 'zh' ? '添加新部门管理员' : 'Add New Department Manager'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                placeholder={language === 'zh' ? '管理员姓名' : 'Admin Name'}
                className="p-2 border rounded-lg"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input 
                placeholder={language === 'zh' ? '部门名称 (如: 生鲜部)' : 'Department Name'}
                className="p-2 border rounded-lg"
                value={newDept}
                onChange={e => setNewDept(e.target.value)}
              />
              <input 
                placeholder={language === 'zh' ? '登录密码' : 'Password'}
                className="p-2 border rounded-lg"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg font-bold"
              >
                Confirm Add
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managers.map(mgr => (
              <div key={mgr.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                {editingId === mgr.id ? (
                  // EDIT MODE CARD
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold">Dept Name</label>
                      <input 
                        value={editDept}
                        onChange={e => setEditDept(e.target.value)}
                        className="w-full p-2 border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                       <label className="text-[10px] text-slate-400 uppercase font-bold">Manager Name</label>
                       <input 
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full p-2 border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                       <label className="text-[10px] text-slate-400 uppercase font-bold">Password</label>
                       <input 
                        value={editPass}
                        onChange={e => setEditPass(e.target.value)}
                        className="w-full p-2 border border-brand-300 rounded focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                       <button onClick={handleCancelEdit} className="p-2 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={16} />
                       </button>
                       <button onClick={() => handleSaveEdit(mgr)} className="p-2 bg-green-500 text-white hover:bg-green-600 rounded">
                          <Save size={16} />
                       </button>
                    </div>
                  </div>
                ) : (
                  // VIEW MODE CARD
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-brand-50 text-brand-700 p-2 rounded-lg">
                        <Building2 size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleStartEdit(mgr)}
                          className="text-slate-300 hover:text-brand-600 p-1.5 hover:bg-brand-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteManager(mgr.id)}
                          className="text-slate-300 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{mgr.departmentName}</h3>
                    
                    <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                       <Users size={14} />
                       <span>{mgr.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-4">
                       <Key size={12} />
                       <span>{mgr.password}</span>
                    </div>

                    <button
                      onClick={() => onSelectManager(mgr.id)}
                      className="w-full py-2 bg-slate-50 hover:bg-brand-600 hover:text-white text-slate-600 font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-sm border border-slate-100"
                    >
                      <Eye size={16} />
                      {language === 'zh' ? '查看数据 / 管理' : 'View Data / Manage'}
                    </button>
                  </>
                )}
              </div>
            ))}
            
            {/* Add New Placeholder */}
            {managers.length === 0 && (
                <div 
                  onClick={() => setIsAdding(true)}
                  className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-brand-300 hover:text-brand-500 transition-colors min-h-[200px]"
                >
                    <Plus size={32} className="mb-2" />
                    <span>{language === 'zh' ? '添加第一个部门' : 'Add First Department'}</span>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Migration Tool */}
      <div className="bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden relative">
        <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
             <Database size={20} className="text-amber-600" />
             {language === 'zh' ? '数据迁移工具' : 'Legacy Data Migration'}
          </h3>
          <button onClick={fetchStats} className="text-amber-600 hover:bg-amber-100 p-2 rounded-full transition-colors" title="Refresh Stats">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="p-6">
           <div className="flex flex-col md:flex-row gap-6 items-center">
              
              {/* Source Stats */}
              <div className="flex-1 w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                   {language === 'zh' ? '遗留/旧数据池' : 'Source: Legacy Pool'}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                   <div className="bg-white p-2 rounded border border-slate-100">
                      <div className="text-xl font-bold text-slate-800">{legacyStats.locations}</div>
                      <div className="text-[10px] text-slate-500">{language === 'zh' ? '点位' : 'Locs'}</div>
                   </div>
                   <div className="bg-white p-2 rounded border border-slate-100">
                      <div className="text-xl font-bold text-slate-800">{legacyStats.cleaners}</div>
                      <div className="text-[10px] text-slate-500">{language === 'zh' ? '保洁员' : 'Cleaners'}</div>
                   </div>
                   <div className="bg-white p-2 rounded border border-slate-100">
                      <div className="text-xl font-bold text-slate-800">{legacyStats.logs}</div>
                      <div className="text-[10px] text-slate-500">{language === 'zh' ? '记录' : 'Logs'}</div>
                   </div>
                </div>
                {!hasLegacyData && (
                   <div className="mt-3 text-xs text-green-600 font-bold flex items-center gap-1 justify-center">
                      <AlertCircle size={12} />
                      {language === 'zh' ? '数据已全部清理' : 'All clean!'}
                   </div>
                )}
              </div>

              <ArrowRight size={32} className="text-slate-300 hidden md:block" />
              
              {/* Target & Action */}
              <div className="flex-1 w-full flex flex-col gap-3">
                 <label className="text-sm font-bold text-slate-700">
                    {language === 'zh' ? '划拨给哪个部门？' : 'Assign to Department:'}
                 </label>
                 <select 
                   className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                   value={migrationTargetId}
                   onChange={(e) => setMigrationTargetId(e.target.value)}
                   disabled={!hasLegacyData}
                 >
                   <option value="">{language === 'zh' ? '-- 请选择接收部门 --' : '-- Select Target --'}</option>
                   {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.departmentName} ({m.name})</option>
                   ))}
                 </select>

                 <button
                   onClick={handleMigration}
                   disabled={!hasLegacyData || !migrationTargetId || isMigrating}
                   className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                 >
                    {isMigrating ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                    {language === 'zh' ? '确认迁移数据' : 'Transfer Data'}
                 </button>
                 
                 {migrationMsg && (
                    <p className={`text-center text-sm font-bold ${migrationMsg.includes('失败') || migrationMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
                      {migrationMsg}
                    </p>
                 )}
              </div>
           </div>
           
           <div className="mt-4 text-xs text-slate-400 bg-slate-50 p-2 rounded border border-slate-100">
             <strong>Note:</strong> {language === 'zh' ? '旧数据通常指版本更新前创建的、或仍属于“demo-mgr”的数据。使用此工具将其分配给新创建的正式部门。' : 'Legacy data refers to data created before the update or belonging to "demo-mgr". Use this to assign them to real departments.'}
           </div>
        </div>
      </div>

    </div>
  );
};

export default MasterDashboard;


import React, { useState } from 'react';
import { Cleaner, Manager, Language, UserRole } from '../types';
import { TRANSLATIONS, DEFAULT_MANAGER_PASSWORD } from '../constants';
import { ShieldCheck, User, Lock, LogIn, Cloud, Building2, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  cleaners: Cleaner[];
  managers: Manager[]; // New prop
  onLogin: (role: UserRole, data?: any) => void;
  language: Language;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ cleaners, managers, onLogin, language }) => {
  const [activeTab, setActiveTab] = useState<'master' | 'manager' | 'cleaner'>('cleaner');
  
  // Cleaner State
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');
  
  // Manager State
  const [managerLoginId, setManagerLoginId] = useState<string>('');
  
  // Shared
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const t = TRANSLATIONS[language];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'master') {
      if (password === DEFAULT_MANAGER_PASSWORD) {
        onLogin('master');
      } else {
        setError(t.invalidPassword);
      }
    } 
    else if (activeTab === 'manager') {
      const mgr = managers.find(m => m.id === managerLoginId);
      if (mgr) {
        if (mgr.password === password) {
          onLogin('manager', mgr);
        } else {
          setError(t.invalidPassword);
        }
      } else {
        setError(language === 'zh' ? '未找到该管理员账号' : 'Manager account not found');
      }
    }
    else {
      // Cleaner Login
      if (!selectedManagerId) {
        setError(language === 'zh' ? '请先选择部门' : 'Select a department first');
        return;
      }
      const cleaner = cleaners.find(c => c.id === selectedCleanerId);
      if (cleaner) {
        if (cleaner.password === password) {
          onLogin('cleaner', cleaner);
        } else {
          setError(t.invalidPassword);
        }
      } else {
        setError(language === 'zh' ? '请选择用户' : 'Please select a user');
      }
    }
  };

  const filteredCleaners = cleaners.filter(c => c.managerId === selectedManagerId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg mx-auto mb-4 text-2xl relative">
          CT
          <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1.5 border-2 border-white shadow-sm">
             <Cloud size={12} fill="white" className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{t.appTitle}</h1>
        <p className="text-slate-500 mt-1">{t.loginTitle}</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setActiveTab('cleaner'); setError(''); setPassword(''); }}
            className={`flex-1 py-4 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
              activeTab === 'cleaner' 
                ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User size={18} />
            {t.loginAsCleaner}
          </button>
          <button
            onClick={() => { setActiveTab('manager'); setError(''); setPassword(''); }}
            className={`flex-1 py-4 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
              activeTab === 'manager' 
                ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Building2 size={18} />
            {language === 'zh' ? '部门管理' : 'Dept Admin'}
          </button>
          <button
            onClick={() => { setActiveTab('master'); setError(''); setPassword(''); }}
            className={`flex-1 py-4 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-colors ${
              activeTab === 'master' 
                ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShieldCheck size={18} />
            {language === 'zh' ? '总控' : 'Master'}
          </button>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-5">
          
          {/* --- CLEANER LOGIN FORM --- */}
          {activeTab === 'cleaner' && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">{language === 'zh' ? '选择部门' : 'Select Department'}</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-900"
                  value={selectedManagerId}
                  onChange={(e) => { setSelectedManagerId(e.target.value); setSelectedCleanerId(''); }}
                  required
                >
                  <option value="" disabled>{language === 'zh' ? '-- 请选择部门 --' : '-- Select Dept --'}</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.departmentName}</option>
                  ))}
                </select>
              </div>

              {selectedManagerId && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-sm font-medium text-slate-700">{t.selectCleaner}</label>
                  <select
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-900"
                    value={selectedCleanerId}
                    onChange={(e) => setSelectedCleanerId(e.target.value)}
                    required
                  >
                    <option value="" disabled>{t.selectCleaner}...</option>
                    {filteredCleaners.length > 0 ? (
                      filteredCleaners.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    ) : (
                      <option disabled>{language === 'zh' ? '该部门暂无保洁员' : 'No cleaners in this dept'}</option>
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          {/* --- MANAGER LOGIN FORM --- */}
          {activeTab === 'manager' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">{language === 'zh' ? '选择管理的部门' : 'Select Your Department'}</label>
              <select
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 bg-slate-50 text-slate-900"
                value={managerLoginId}
                onChange={(e) => setManagerLoginId(e.target.value)}
                required
              >
                <option value="" disabled>{language === 'zh' ? '-- 请选择 --' : '-- Select --'}</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.departmentName} - {m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* --- PASSWORD INPUT (ALL) --- */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.enterPassword}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center font-medium animate-bounce-short">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {t.login}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center flex flex-col items-center gap-1">
         <span className="text-brand-600 bg-brand-50 px-3 py-1 rounded-full text-xs font-bold border border-brand-100">
            CleanTrack Enterprise v4.0
         </span>
         <span className="text-slate-400 text-[10px] flex items-center gap-1">
           <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
           Multi-Department Cloud System
         </span>
      </div>
    </div>
  );
};

export default LoginScreen;

import React, { useState, useEffect } from 'react';
import { Cleaner, Language, UserRole } from '../types';
import { TRANSLATIONS, DEFAULT_MANAGER_PASSWORD } from '../constants';
import { ShieldCheck, User, Lock, LogIn, Cloud, ServerCog } from 'lucide-react';
import CloudSetup from './CloudSetup';
import { getStoredConfig } from '../services/firebase';

interface LoginScreenProps {
  cleaners: Cleaner[];
  onLogin: (role: UserRole, cleaner?: Cleaner) => void;
  language: Language;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ cleaners, onLogin, language }) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'cleaner'>('cleaner');
  const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  const t = TRANSLATIONS[language];

  // Check initial cloud status
  useEffect(() => {
    setIsCloudConfigured(!!getStoredConfig());
    if (window.location.hash === '#setup') {
      setShowCloudSetup(true);
    }
  }, [showCloudSetup]); // Re-check when modal closes

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'manager') {
      if (password === DEFAULT_MANAGER_PASSWORD) {
        onLogin('manager');
      } else {
        setError(t.invalidPassword);
      }
    } else {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      
      <CloudSetup 
        isOpen={showCloudSetup} 
        onClose={() => setShowCloudSetup(false)} 
        language={language} 
      />

      {/* --- SUPER VISIBLE TOP BANNER --- */}
      <button 
        onClick={() => setShowCloudSetup(true)}
        className={`w-full py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold shadow-sm transition-colors ${
          isCloudConfigured 
            ? 'bg-green-600 text-white hover:bg-green-700' 
            : 'bg-slate-800 text-white hover:bg-slate-700'
        }`}
      >
        <ServerCog size={20} />
        <span>
          {language === 'zh' 
            ? (isCloudConfigured ? '云端同步已开启 (点击配置)' : '点击此处配置云端同步数据库') 
            : (isCloudConfigured ? 'Cloud Sync Active (Configure)' : 'Click Here to Setup Cloud Database')}
        </span>
      </button>

      <div className="flex-1 flex flex-col justify-center items-center w-full p-4">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg mx-auto mb-4 text-3xl">
            CT
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{t.appTitle}</h1>
          <p className="text-slate-500 mt-2">{t.loginTitle}</p>
        </div>

        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setActiveTab('cleaner'); setError(''); setPassword(''); }}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
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
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'manager' 
                  ? 'bg-brand-50 text-brand-600 border-b-2 border-brand-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShieldCheck size={18} />
              {t.loginAsManager}
            </button>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {activeTab === 'cleaner' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{t.selectCleaner}</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-slate-50"
                  value={selectedCleanerId}
                  onChange={(e) => setSelectedCleanerId(e.target.value)}
                  required
                >
                  <option value="" disabled>{t.selectCleaner}...</option>
                  {cleaners.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.enterPassword}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>
              {activeTab === 'cleaner' && (
                <p className="text-xs text-slate-400 mt-1">Default: 123</p>
              )}
              {activeTab === 'manager' && (
                <p className="text-xs text-slate-400 mt-1">Default: admin</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <LogIn size={20} />
                {t.login}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-slate-400 text-xs">
           CleanTrack System v1.2
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
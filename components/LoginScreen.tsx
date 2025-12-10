import React, { useState } from 'react';
import { Cleaner, Language, UserRole } from '../types';
import { TRANSLATIONS, DEFAULT_MANAGER_PASSWORD } from '../constants';
import { ShieldCheck, User, Lock, LogIn, Cloud, Settings } from 'lucide-react';
import CloudSetup from './CloudSetup';

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

  const t = TRANSLATIONS[language];

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 animate-fade-in relative">
      
      <CloudSetup 
        isOpen={showCloudSetup} 
        onClose={() => setShowCloudSetup(false)} 
        language={language} 
      />

      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg mx-auto mb-4 text-2xl">
          CT
        </div>
        <h1 className="text-3xl font-bold text-slate-800">{t.appTitle}</h1>
        <p className="text-slate-500 mt-2">{t.loginTitle}</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative z-10">
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

          <button
            type="submit"
            className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={20} />
            {t.login}
          </button>
        </form>
      </div>

      {/* Cloud Sync Button - Moved to Bottom Center */}
      <div className="mt-8 text-center z-10">
         <button 
           onClick={() => setShowCloudSetup(true)}
           className="group flex flex-col items-center gap-2 text-slate-400 hover:text-brand-600 transition-colors"
         >
           <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 group-hover:border-brand-300 group-hover:scale-110 transition-all">
             <Cloud size={20} />
           </div>
           <span className="text-sm font-medium underline decoration-dashed underline-offset-4 decoration-slate-300 group-hover:decoration-brand-300">
             {language === 'zh' ? '配置云端同步 (多设备)' : 'Configure Cloud Sync'}
           </span>
         </button>
      </div>
    </div>
  );
};

export default LoginScreen;
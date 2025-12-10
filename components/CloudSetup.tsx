import React, { useState } from 'react';
import { getStoredConfig, saveConfig, clearConfig } from '../services/firebase';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';
import { Cloud, Save, Trash2, X } from 'lucide-react';

interface CloudSetupProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

const CloudSetup: React.FC<CloudSetupProps> = ({ isOpen, onClose, language }) => {
  const [configJson, setConfigJson] = useState('');
  const [error, setError] = useState('');
  const isConfigured = !!getStoredConfig();

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      // Allow users to paste the full JS object or just the JSON content
      let cleanJson = configJson.trim();
      // Remove "const firebaseConfig =" and ";" if user pasted JS code
      if (cleanJson.includes('=')) {
        cleanJson = cleanJson.substring(cleanJson.indexOf('=') + 1).trim();
      }
      if (cleanJson.endsWith(';')) {
        cleanJson = cleanJson.slice(0, -1);
      }

      // Fix unquoted keys if necessary (simple regex attempt, but ideally user pastes JSON)
      // For now, assume user pastes valid JSON or we instruct them to.
      
      const config = JSON.parse(cleanJson);
      
      if (!config.apiKey || !config.projectId) {
        setError(language === 'zh' ? '配置无效：缺少 apiKey 或 projectId' : 'Invalid Config: Missing apiKey or projectId');
        return;
      }

      saveConfig(config);
      onClose();
    } catch (e) {
      setError(language === 'zh' ? 'JSON 格式错误，请确保格式正确' : 'Invalid JSON format.');
    }
  };

  const t = {
    title: language === 'zh' ? '多设备云端同步设置' : 'Cloud Sync Setup',
    desc: language === 'zh' 
      ? '若要实现手机与电脑实时同步数据，请使用 Google Firebase。' 
      : 'To sync data across devices in real-time, configure Google Firebase.',
    instruction: language === 'zh'
      ? '1. 访问 console.firebase.google.com 创建免费项目\n2. 添加 Web 应用\n3. 复制 firebaseConfig 对象 (JSON)\n4. 粘贴到下方'
      : '1. Go to console.firebase.google.com & create free project\n2. Add Web App\n3. Copy firebaseConfig object (JSON)\n4. Paste below',
    placeholder: '{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "..."\n}',
    connected: language === 'zh' ? '已连接云端数据库' : 'Connected to Cloud Database',
    disconnect: language === 'zh' ? '断开连接 (恢复本地模式)' : 'Disconnect (Reset to Local)',
    save: language === 'zh' ? '保存并连接' : 'Save & Connect',
    cancel: language === 'zh' ? '关闭' : 'Close'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Cloud className="text-brand-400" />
            {t.title}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X />
          </button>
        </div>
        
        <div className="p-6">
          {isConfigured ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{t.connected}</h3>
              <p className="text-slate-500 mb-6 text-sm px-8">
                {language === 'zh' 
                  ? '当前应用正在使用云端数据库。所有设备使用相同配置即可互通数据。' 
                  : 'App is currently syncing with the cloud. Use the same config on other devices to sync.'}
              </p>
              <button 
                onClick={clearConfig}
                className="flex items-center justify-center gap-2 mx-auto text-red-600 bg-red-50 hover:bg-red-100 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Trash2 size={18} />
                {t.disconnect}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {t.instruction}
              </p>
              
              <textarea
                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none mb-2"
                placeholder={t.placeholder}
                value={configJson}
                onChange={(e) => { setConfigJson(e.target.value); setError(''); }}
              ></textarea>
              
              {error && (
                <p className="text-red-500 text-sm mb-4 font-medium">{error}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 text-slate-500 font-medium hover:bg-slate-50 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 shadow-md flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {t.save}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudSetup;
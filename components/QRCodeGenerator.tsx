import React from 'react';
import QRCode from 'react-qr-code';
import { Location, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  locations: Location[];
  language: Language;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ locations, language }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="bg-white min-h-screen">
      {/* Screen-only Header */}
      <div className="no-print p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="text-brand-600" />
            {t.qrCodes}
          </h2>
          <p className="text-slate-500 mt-1">{t.printInstruction}</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-brand-700 transition-colors"
        >
          {language === 'zh' ? '打印本页' : 'Print Page'}
        </button>
      </div>

      {/* Printable Grid */}
      <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
        {locations.map(loc => (
          <div 
            key={loc.id} 
            className="border-2 border-slate-900 rounded-xl p-6 flex flex-col items-center justify-center text-center break-inside-avoid shadow-sm"
          >
            <div className="mb-4">
              <QRCode 
                value={JSON.stringify({ id: loc.id })} 
                size={140}
                viewBox={`0 0 256 256`}
              />
            </div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
              {language === 'zh' ? loc.nameZh : loc.nameEn}
            </h3>
            <p className="text-xs text-slate-500 font-mono uppercase">
              ID: {loc.id}
            </p>
             <p className="text-xs text-brand-600 font-bold mt-2 uppercase border border-brand-200 bg-brand-50 px-2 py-0.5 rounded">
              {loc.zone}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QRCodeGenerator;
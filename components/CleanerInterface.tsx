import React, { useState, useEffect, useRef } from 'react';
import { Location, Cleaner, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Scan, CheckCircle2, MapPin, QrCode, Camera, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface CleanerInterfaceProps {
  locations: Location[];
  currentCleaner: Cleaner;
  onLogCleaning: (locationId: string) => void;
  language: Language;
}

const CleanerInterface: React.FC<CleanerInterfaceProps> = ({ 
  locations, 
  currentCleaner, 
  onLogCleaning,
  language
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [useRealCamera, setUseRealCamera] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const t = TRANSLATIONS[language];

  // Effect to handle Real Camera Scanner lifecycle
  useEffect(() => {
    if (useRealCamera && !selectedLocation) {
      // Small timeout to ensure DOM element exists
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
             // Success callback
             try {
               // Try parsing JSON first
               const data = JSON.parse(decodedText);
               const locId = data.id || decodedText;
               const loc = locations.find(l => l.id === locId);
               
               if (loc) {
                 handleScanSuccess(loc);
               } else {
                 console.warn("Location not found for ID:", locId);
               }
             } catch (e) {
               // Fallback: assume raw text is ID
               const loc = locations.find(l => l.id === decodedText);
               if (loc) handleScanSuccess(loc);
             }
          },
          (error) => {
             // Ignore read errors, they happen every frame
          }
        );
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [useRealCamera, selectedLocation]);

  const handleScanSuccess = (loc: Location) => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    setUseRealCamera(false);
    setSelectedLocation(loc);
  };

  // Simulating the "Scan" action
  const handleScanSimulation = (location: Location) => {
    setIsScanning(true);
    // Simulate delay of camera opening/processing
    setTimeout(() => {
      setSelectedLocation(location);
      setIsScanning(false);
    }, 800);
  };

  const handleConfirmClean = () => {
    if (selectedLocation) {
      onLogCleaning(selectedLocation.id);
      const locName = language === 'zh' ? selectedLocation.nameZh : selectedLocation.nameEn;
      setSuccessMsg(`${t.successCheckIn} ${locName}`);
      setSelectedLocation(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  if (selectedLocation) {
    const locName = language === 'zh' ? selectedLocation.nameZh : selectedLocation.nameEn;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-brand-100 max-w-sm w-full">
           <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <MapPin size={40} />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.confirmLocation}</h2>
           <p className="text-slate-500 mb-8">{t.scannedCodeFor}</p>
           
           <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8">
              <h3 className="text-xl font-bold text-brand-700">{locName}</h3>
              <p className="text-sm text-slate-400 mt-1">{selectedLocation.zone}</p>
           </div>

           <div className="flex flex-col gap-3">
             <button 
                onClick={handleConfirmClean}
                className="w-full bg-brand-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <CheckCircle2 />
                {t.completeTask}
             </button>
             <button 
                onClick={() => setSelectedLocation(null)}
                className="w-full bg-white text-slate-500 font-medium py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
             >
                {t.cancel}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in pb-20">
      {/* Header Profile */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 mb-6">
        <img 
          src={currentCleaner.avatar} 
          alt={currentCleaner.name} 
          className="w-12 h-12 rounded-full border-2 border-brand-100"
        />
        <div>
          <p className="text-xs text-slate-400 font-medium">{t.loggedInAs}</p>
          <h2 className="text-lg font-bold text-slate-800">{currentCleaner.name}</h2>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-bounce-short">
          <CheckCircle2 size={20} />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Real Scanner Toggle */}
      <div className="mb-6">
        {!useRealCamera ? (
          <button 
            onClick={() => setUseRealCamera(true)}
            className="w-full bg-slate-900 text-white py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
          >
            <Camera size={24} />
            <span className="font-bold text-lg">{t.realScan}</span>
          </button>
        ) : (
           <div className="bg-black rounded-xl overflow-hidden p-2 relative">
             <div id="reader" className="w-full bg-black"></div>
             <button 
               onClick={() => setUseRealCamera(false)}
               className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white p-2 rounded-full hover:bg-white/40 z-10"
             >
               <XCircle size={24} />
             </button>
             <p className="text-center text-white/70 text-xs py-2">Point camera at QR code</p>
           </div>
        )}
      </div>

      <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase">OR Simulate</span>
          <div className="flex-grow border-t border-slate-200"></div>
      </div>

      {/* Simulator Instructions */}
      <div className="mt-6">
        <h3 className="text-slate-800 font-bold mb-3 flex items-center gap-2">
          <QrCode className="text-brand-500" size={20}/>
          {t.tapToScan}
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          {t.scanInstruction}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => handleScanSimulation(loc)}
              disabled={isScanning}
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-400 hover:shadow-md transition-all text-left group relative overflow-hidden"
            >
              {isScanning && (
                <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center backdrop-blur-[1px]">
                  <Scan className="animate-pulse text-brand-600" />
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                 <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                   {loc.zone}
                 </span>
              </div>
              <h4 className="font-bold text-slate-700 group-hover:text-brand-700 transition-colors">
                {language === 'zh' ? loc.nameZh : loc.nameEn}
              </h4>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CleanerInterface;
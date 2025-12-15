import React, { useState, useEffect, useRef } from 'react';
import { Location, Cleaner, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { CheckCircle2, MapPin, Camera, XCircle, LogOut } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CleanerInterfaceProps {
  locations: Location[];
  currentCleaner: Cleaner;
  onLogCleaning: (locationId: string) => void;
  language: Language;
  onLogout: () => void;
}

const CleanerInterface: React.FC<CleanerInterfaceProps> = ({ 
  locations, 
  currentCleaner, 
  onLogCleaning,
  language,
  onLogout
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // We use a ref to hold the instance of Html5Qrcode
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "reader-container";

  const t = TRANSLATIONS[language];

  // Effect to handle Real Camera Scanner lifecycle
  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraError('');
        
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch (e) {
            console.warn("Error stopping previous instance", e);
          }
        }

        const html5QrCode = new Html5Qrcode(scannerDivId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
          },
          (decodedText) => {
             if (!isMounted) return;
             
             try {
               const data = JSON.parse(decodedText);
               const locId = data.id || decodedText;
               const loc = locations.find(l => l.id === locId);
               
               if (loc) {
                 handleScanSuccess(loc);
               } else {
                 console.warn("Location not found for ID:", locId);
               }
             } catch (e) {
               const loc = locations.find(l => l.id === decodedText);
               if (loc) handleScanSuccess(loc);
             }
          },
          (errorMessage) => {
             // ignore frame errors
          }
        );
      } catch (err) {
        if (isMounted) {
          console.error("Error starting scanner", err);
          setCameraError(language === 'zh' ? '无法启动摄像头，请确保已授权。' : 'Cannot start camera. Please check permissions.');
        }
      }
    };

    if (useRealCamera && !selectedLocation) {
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error).finally(() => {
          if (html5QrCodeRef.current) {
            html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
          }
        });
      }
    }

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
           html5QrCodeRef.current.stop().catch(console.error);
        }
        html5QrCodeRef.current.clear();
      }
    };
  }, [useRealCamera, selectedLocation, locations, language]);

  const handleScanSuccess = async (loc: Location) => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (e) {
        console.error("Stop failed", e);
      }
    }
    setUseRealCamera(false);
    setSelectedLocation(loc);
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

  const handleStopCamera = async () => {
    setUseRealCamera(false);
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      } catch (e) { console.error(e); }
    }
  }

  if (selectedLocation) {
    const locName = language === 'zh' ? selectedLocation.nameZh : selectedLocation.nameEn;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center animate-fade-in">
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-brand-100 max-w-sm w-full">
           <div className="w-24 h-24 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <MapPin size={48} />
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.confirmLocation}</h2>
           <p className="text-slate-500 mb-8">{t.scannedCodeFor}</p>
           
           <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 mb-8">
              <h3 className="text-xl font-bold text-brand-700">{locName}</h3>
              <p className="text-sm text-slate-400 mt-2">{selectedLocation.zone}</p>
           </div>

           <div className="flex flex-col gap-4">
             <button 
                onClick={handleConfirmClean}
                className="w-full bg-brand-600 text-white font-bold text-xl py-5 rounded-xl shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <CheckCircle2 size={24} />
                {t.completeTask}
             </button>
             <button 
                onClick={() => setSelectedLocation(null)}
                className="w-full bg-white text-slate-500 font-medium py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
             >
                {t.cancel}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in pb-20 pt-2 px-2 md:px-0">
      {/* Header Profile */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img 
            src={currentCleaner.avatar} 
            alt={currentCleaner.name} 
            className="w-14 h-14 rounded-full border-2 border-brand-100 p-0.5"
          />
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{t.loggedInAs}</p>
            <h2 className="text-xl font-bold text-slate-800">{currentCleaner.name}</h2>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-3 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors"
        >
          <LogOut size={22} />
        </button>
      </div>

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl flex items-center gap-3 animate-bounce-short shadow-sm">
          <CheckCircle2 size={24} className="shrink-0" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      {/* Real Scanner Toggle */}
      <div className="mb-6">
        {!useRealCamera ? (
          <div className="space-y-4">
            <button 
              onClick={() => setUseRealCamera(true)}
              className="w-full bg-slate-900 text-white py-16 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-5 hover:bg-slate-800 active:scale-95 transition-all group"
            >
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Camera size={48} className="text-brand-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-2xl">{t.realScan}</span>
                <span className="text-slate-400 text-sm mt-2 font-medium opacity-80">{t.scanInstruction}</span>
              </div>
            </button>
          </div>
        ) : (
           <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl border-4 border-slate-900">
             {/* The container for html5-qrcode */}
             <div id={scannerDivId} className="w-full bg-black min-h-[400px] text-white"></div>
             
             {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-8 text-center z-10">
                    <p className="text-lg font-medium">{cameraError}</p>
                </div>
             )}

             <button 
               onClick={handleStopCamera}
               className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/40 z-20 transition-colors"
             >
               <XCircle size={32} />
             </button>
             
             <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                <p className="text-white/70 text-sm bg-black/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
                   Scanning...
                </p>
             </div>
           </div>
        )}
      </div>

      <div className="text-center text-slate-400 text-sm mt-8 px-8 font-medium">
        {t.scanFooter}
      </div>
    </div>
  );
};

export default CleanerInterface;
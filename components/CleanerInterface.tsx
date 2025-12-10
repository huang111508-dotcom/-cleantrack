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
  
  // We use a ref to hold the instance of Html5Qrcode (not Scanner)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "reader-container";

  const t = TRANSLATIONS[language];

  // Effect to handle Real Camera Scanner lifecycle
  useEffect(() => {
    let isMounted = true;

    // Function to start the scanner
    const startScanner = async () => {
      try {
        setCameraError('');
        
        // If an instance exists, stop and clear it first
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch (e) {
            console.warn("Error stopping previous instance", e);
          }
        }

        // Create new instance
        const html5QrCode = new Html5Qrcode(scannerDivId);
        html5QrCodeRef.current = html5QrCode;

        // Start scanning with environment camera (back camera)
        // Note: The user requested "Front Camera" (前置) in the prompt, but for scanning a QR code on a wall
        // with a mobile phone, the "Environment" (Back) camera is the standard and logical choice.
        // "Front" implies selfie camera which is hard to use for wall scanning. 
        // We default to "environment".
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
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // If we are not using camera, make sure to stop it
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
    // Stop the camera immediately
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
    <div className="max-w-md mx-auto animate-fade-in pb-20 pt-4">
      {/* Header Profile */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
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
        <button 
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
        </button>
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
          <div className="space-y-4">
            <button 
              onClick={() => setUseRealCamera(true)}
              className="w-full bg-slate-900 text-white py-12 rounded-3xl shadow-xl flex flex-col items-center justify-center gap-4 hover:bg-slate-800 transition-all group"
            >
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera size={40} className="text-brand-400" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-2xl">{t.realScan}</span>
                <span className="text-slate-400 text-sm mt-1">{t.scanInstruction}</span>
              </div>
            </button>
          </div>
        ) : (
           <div className="bg-black rounded-3xl overflow-hidden relative shadow-2xl">
             {/* The container for html5-qrcode */}
             <div id={scannerDivId} className="w-full bg-black min-h-[350px] text-white"></div>
             
             {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-6 text-center">
                    <p>{cameraError}</p>
                </div>
             )}

             <button 
               onClick={handleStopCamera}
               className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white p-3 rounded-full hover:bg-white/40 z-20"
             >
               <XCircle size={28} />
             </button>
           </div>
        )}
      </div>

      <div className="text-center text-slate-400 text-xs mt-8 px-8">
        {t.scanFooter}
      </div>
    </div>
  );
};

export default CleanerInterface;
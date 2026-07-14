import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X } from 'lucide-react';

interface ScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function ScannerModal({ onScan, onClose }: ScannerModalProps) {
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isSuccessRef = useRef(false);

  useEffect(() => {
    let isComponentMounted = true;
    isSuccessRef.current = false;
    setIsSuccess(false);

    const html5QrCode = new Html5Qrcode("modal-reader", { 
      verbose: false,
      useBarCodeDetectorIfSupported: true
    });
    scannerRef.current = html5QrCode;
    
    const formatsToSupport = [
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
    ];

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 15,
        formatsToSupport: formatsToSupport,
        qrbox: { width: 300, height: 150 },
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" } as any, { zoom: 2.0 } as any]
        }
      },
      (decodedText) => {
        if (isComponentMounted && scannerRef.current && !isSuccessRef.current) {
          isSuccessRef.current = true;
          setIsSuccess(true);
          
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
          } catch(e) {}

          setTimeout(() => {
            if (isComponentMounted && scannerRef.current?.isScanning) {
              scannerRef.current.stop().then(() => {
                onScan(decodedText);
                onClose();
              }).catch(() => {
                onScan(decodedText);
                onClose();
              });
            } else if (isComponentMounted) {
              onScan(decodedText);
              onClose();
            }
          }, 400);
        }
      },
      (errorMessage) => {
        // نادیده گرفتن خطاها
      }
    ).then(() => {
      if (!isComponentMounted) {
        html5QrCode.stop().catch(() => {});
      }
    }).catch(err => {
      if (isComponentMounted) {
        console.error("Camera start error detailed:", err);
        let errMsg = "خطا در دسترسی به دوربین. لطفاً دسترسی‌های لازم را بررسی کنید.";
        if (err) {
          errMsg += `\nجزئیات: ${typeof err === 'string' ? err : err.message || JSON.stringify(err)}`;
        }
        setError(errMsg);
      }
    });

    return () => {
      isComponentMounted = false;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 print:hidden backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl overflow-hidden relative shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 relative">
          <h2 className="font-bold">اسکنر بارکد (دوربین موبایل)</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="relative w-full h-[400px] bg-black overflow-hidden flex items-center justify-center">
          <div id="modal-reader" className="w-full flex justify-center items-center"></div>
          
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
            <div className={`w-[300px] h-[150px] border-4 transition-all duration-300 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-[0_0_0_4000px_rgba(0,0,0,0.5)] ${isSuccess ? 'border-green-500 bg-green-500/20 scale-105' : 'border-red-500 bg-red-500/10'}`}>
              {!isSuccess && (
                <div className="absolute left-0 right-0 h-[2px] bg-red-500 opacity-70 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)]" style={{ animation: 'scan-line 2s infinite ease-in-out' }}></div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes scan-line {
              0% { top: 5%; }
              50% { top: 95%; }
              100% { top: 5%; }
            }
            #qr-shaded-region {
              display: none !important;
            }
          `}</style>
        </div>
        {error && <div className="p-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 text-center font-medium whitespace-pre-wrap max-h-40 overflow-y-auto">{error}</div>}
        <div className="p-5 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-900/50">
          بارکد کالا را در کادر قرمز قرار دهید
        </div>
      </div>
    </div>
  );
}

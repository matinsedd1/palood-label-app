import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface CameraScannerProps {
  onScan: (decodedText: string) => void;
}

export default function CameraScanner({ onScan }: CameraScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isComponentMounted = true;
    const html5QrCode = new Html5Qrcode("inline-reader", { verbose: false });
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
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          advanced: [{ focusMode: "continuous" } as any]
        }
      },
      (decodedText) => {
        if (isComponentMounted && scannerRef.current && !isSuccess) {
          setIsSuccess(true);
          
          // ایجاد صدای بوق
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
            if (isComponentMounted) {
              if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().then(() => {
                  onScan(decodedText);
                }).catch(() => {
                  onScan(decodedText);
                });
              } else {
                onScan(decodedText);
              }
            }
          }, 400); // تاخیر کوتاه برای نمایش رنگ سبز
        }
      },
      (errorMessage) => {
        // نادیده گرفتن خطاهای پیوسته
      }
    ).then(() => {
      // اگر کامپوننت قبل از اتمام راه اندازی دوربین از بین رفته بود، دوربین را متوقف کن
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
  }, [onScan, isSuccess]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div id="inline-reader" className="w-full flex justify-center items-center"></div>
      
      {/* overlay اسکنر */}
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

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-red-500 text-sm p-4 text-center z-20 whitespace-pre-wrap max-h-full overflow-y-auto">
          {error}
        </div>
      )}
    </div>
  );
}

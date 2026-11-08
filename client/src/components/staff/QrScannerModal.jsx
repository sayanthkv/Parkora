import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const html5QrCode = new Html5Qrcode('qr-reader-viewport');
    qrRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.0,
    };

    // Prioritize mobile environment/rear camera
    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Play a small beep / vibrate feedback
          if (navigator.vibrate) navigator.vibrate(100);
          
          html5QrCode.stop().then(() => {
            onScanSuccess(decodedText);
            onClose();
          }).catch(console.error);
        },
        (errorMessage) => {
          // Continuous scanning ticks can be ignored
        }
      )
      .catch((err) => {
        console.error('Camera permission/start failed:', err);
      });

    return () => {
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().then(() => qrRef.current.clear()).catch(console.error);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
          <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
            <Camera className="w-5 h-5 text-emerald-600" />
            <span>Scan Parking Ticket QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col items-center">
          <div
            id="qr-reader-viewport"
            className="w-full aspect-square rounded-xl overflow-hidden bg-black"
          ></div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Point camera directly at user's digital pass or printed QR
          </p>
        </div>
      </div>
    </div>
  );
}
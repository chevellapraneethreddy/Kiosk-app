import React from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';

interface ResultViewerProps {
  inputImageUrl?: string;
  generatedImageUrl: string;
  qrDataUrl: string;
  onStartOver: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  generatedImageUrl,
  qrDataUrl,
  onStartOver,
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `AI_Virtual_TryOn_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none">
      {/* 1. FULL-SCREEN GENERATED TRY-ON FASHION MIRROR IMAGE */}
      <img
        src={generatedImageUrl}
        alt="AI Virtual Try-On Result"
        className="w-full h-full object-cover object-top md:object-center"
      />

      {/* Subtle Corner Fashion Kiosk Badge */}
      <div className="absolute top-6 left-6 z-20 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-gold-500/30 text-gold-300 text-xs font-bold uppercase tracking-widest">
        <Sparkles className="w-4 h-4 text-gold-400 animate-spin-slow" />
        <span>AI DIGITAL FASHION MIRROR</span>
      </div>

      {/* 2. FLOATING BOTTOM COMPACT OVERLAY CARD (QR & ACTIONS) */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 w-[92%] max-w-md bg-black/80 backdrop-blur-xl p-5 md:p-6 rounded-3xl border-2 border-gold-500/40 shadow-2xl flex flex-col items-center text-center space-y-4">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl md:text-3xl font-black gold-gradient-text uppercase tracking-wide">
            YOUR LOOK IS READY
          </h2>
          <p className="text-xs md:text-sm text-gray-200 font-semibold tracking-wider uppercase">
            Scan to get your photo
          </p>
        </div>

        {/* Real QR Code Display */}
        <div className="p-2.5 bg-white rounded-2xl border-2 border-gold-400 shadow-xl flex items-center justify-center">
          <img
            src={qrDataUrl}
            alt="Scan QR code to view and download"
            className="w-36 h-36 md:w-44 md:h-44 object-contain"
          />
        </div>

        {/* Compact Action Buttons */}
        <div className="flex items-center space-x-3 w-full pt-1">
          <button
            onClick={handleDownload}
            className="flex-1 py-3 px-4 gold-button text-black font-black text-xs md:text-sm rounded-2xl flex items-center justify-center space-x-2 shadow-lg uppercase tracking-wider transition-all hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD</span>
          </button>

          <button
            onClick={onStartOver}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs md:text-sm rounded-2xl border border-white/20 flex items-center justify-center space-x-2 transition-all hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
            <span>NEW TRY-ON</span>
          </button>
        </div>
      </div>
    </div>
  );
};

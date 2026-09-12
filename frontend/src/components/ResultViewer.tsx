import React, { useState } from 'react';
import { Download, RefreshCw, Eye, EyeOff, QrCode, Globe, Wifi, ExternalLink } from 'lucide-react';

interface ResultViewerProps {
  inputImageUrl?: string;
  generatedImageUrl: string;
  qrDataUrl: string;
  lanQrDataUrl?: string;
  publicResultUrl?: string;
  lanResultUrl?: string;
  onStartOver: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  generatedImageUrl,
  qrDataUrl,
  lanQrDataUrl,
  publicResultUrl,
  lanResultUrl,
  onStartOver,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [networkMode, setNetworkMode] = useState<'tunnel' | 'lan'>('tunnel');

  const activeQr = networkMode === 'lan' && lanQrDataUrl ? lanQrDataUrl : qrDataUrl;
  const activeUrl = networkMode === 'lan' && lanResultUrl ? lanResultUrl : publicResultUrl;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `AI_Fashion_Mirror_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none">
      {/* 100vw × 100vh Full Cover Background Image */}
      <img
        src={generatedImageUrl}
        alt="AI Digital Fashion Mirror Look"
        className="w-full h-full object-cover pointer-events-none"
        style={{ objectPosition: 'center 12%' }}
      />

      {/* Top-Left Small Badge */}
      <div className="absolute top-5 left-5 z-20 flex items-center space-x-2 bg-[#1a1a1a]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white text-[11px] md:text-xs font-bold tracking-wider uppercase shadow-xl">
        <span className="text-amber-400">✨</span>
        <span className="tracking-widest">AI DIGITAL FASHION MIRROR</span>
      </div>

      {/* Collapsed Pill Button on Left Side */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-30 bg-[#141414]/90 hover:bg-[#202020] backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/20 shadow-2xl flex items-center space-x-2.5 text-amber-400 active:scale-95 transition-all"
        >
          <QrCode className="w-5 h-5 text-[#dfb858]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">SHOW QR CODE</span>
          <Eye className="w-4 h-4 text-gray-300 ml-1" />
        </button>
      ) : (
        /* Floating QR Card Docked to Left Side so Full Person & Photo are 100% Unobstructed */
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 z-30 w-[300px] md:w-[320px] max-w-[85vw] bg-[#141414]/92 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/15 shadow-2xl flex flex-col items-center text-center space-y-3 transition-all duration-300">
          {/* Header & Minimize Toggle */}
          <div className="w-full flex items-start justify-between relative">
            <div className="flex-1 space-y-0.5 text-center">
              <h2 className="font-serif text-lg md:text-xl font-bold tracking-wider text-[#dfb858] uppercase">
                YOUR LOOK IS READY
              </h2>
              <p className="text-[10px] font-bold text-gray-300 tracking-wider uppercase">
                SCAN TO GET YOUR PHOTO
              </p>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute right-0 top-0 p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Hide card to see full photo"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>

          {/* Network Mode Toggle (if LAN fallback is present) */}
          {lanQrDataUrl && (
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs w-full">
              <button
                type="button"
                onClick={() => setNetworkMode('tunnel')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center space-x-1 transition-all ${
                  networkMode === 'tunnel'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3 mr-0.5" />
                <span>Mobile Data</span>
              </button>
              <button
                type="button"
                onClick={() => setNetworkMode('lan')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center space-x-1 transition-all ${
                  networkMode === 'lan'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                <Wifi className="w-3 h-3 mr-0.5" />
                <span>Store Wi-Fi</span>
              </button>
            </div>
          )}

          {/* Real QR Code */}
          <div className="p-2.5 bg-white rounded-xl shadow-lg flex items-center justify-center">
            <img
              src={activeQr}
              alt="Real QR code to view and download result"
              className="w-32 h-32 md:w-36 md:h-36 object-contain"
            />
          </div>

          {/* Direct link preview */}
          {activeUrl && (
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-amber-400/90 hover:underline max-w-[260px] truncate flex items-center space-x-1"
              title={activeUrl}
            >
              <span className="truncate">{activeUrl}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          )}

          {/* Buttons Row */}
          <div className="flex items-center space-x-2 w-full pt-1">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 px-3 bg-[#e2b842] hover:bg-[#cfa532] active:scale-95 text-black font-extrabold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md uppercase tracking-wider transition-all"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>DOWNLOAD</span>
            </button>

            {/* New Try-On Button */}
            <button
              onClick={onStartOver}
              className="flex-1 py-2.5 px-3 bg-[#242424] hover:bg-[#2f2f2f] active:scale-95 text-white font-bold text-xs rounded-xl border border-white/15 flex items-center justify-center space-x-1.5 shadow-md uppercase tracking-wider transition-all"
            >
              <RefreshCw className="w-4 h-4 stroke-[2]" />
              <span>NEW TRY-ON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

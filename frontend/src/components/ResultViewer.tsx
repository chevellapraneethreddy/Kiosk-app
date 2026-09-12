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

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    try {
      setDownloading(true);
      const res = await fetch(generatedImageUrl, { mode: 'cors' });
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `AI_Fashion_Mirror_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.warn('Blob download fallback to direct link:', e);
      window.open(generatedImageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-[#07080b] flex items-center justify-center select-none">
      {/* Ambient glowing background for rich atmosphere */}
      <img
        src={generatedImageUrl}
        alt="Ambient Background"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-105 pointer-events-none"
      />

      {/* Main Full Fashion Image: maximized to full screen with object-fit: contain so full person is 100% visible with zero crop or stretch */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10 pointer-events-none p-0">
        <img
          src={generatedImageUrl}
          alt="AI Digital Fashion Mirror Look"
          className="w-full h-full max-w-full max-h-full pointer-events-none drop-shadow-[0_25px_60px_rgba(0,0,0,0.85)] select-none"
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Top-Left Small Badge */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20 flex items-center space-x-2 bg-[#121318]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white text-[11px] md:text-xs font-bold tracking-wider uppercase shadow-xl pointer-events-auto">
        <span className="text-amber-400">✨</span>
        <span className="tracking-widest">AI DIGITAL FASHION MIRROR</span>
      </div>

      {/* Floating QR Card Overlay: Docked to bottom-left as an overlay without reducing image width */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-30 bg-[#121318]/90 hover:bg-[#20222a] backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/20 shadow-2xl flex items-center space-x-2.5 text-amber-400 active:scale-95 transition-all pointer-events-auto"
        >
          <QrCode className="w-5 h-5 text-[#dfb858]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">SHOW QR CODE</span>
          <Eye className="w-4 h-4 text-gray-300 ml-1" />
        </button>
      ) : (
        <aside className="absolute bottom-4 left-4 md:bottom-6 md:left-6 z-30 w-[290px] sm:w-[310px] max-w-[calc(100vw-2rem)] bg-[#121318]/92 backdrop-blur-2xl px-4 py-3.5 sm:px-5 sm:py-4 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center text-center space-y-2.5 transition-all duration-300 pointer-events-auto">
          {/* Header & Minimize Toggle */}
          <div className="w-full flex items-start justify-between relative">
            <div className="flex-1 space-y-0.5 text-center">
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-wider text-[#dfb858] uppercase">
                YOUR LOOK IS READY
              </h2>
              <p className="text-[10px] font-bold text-gray-300 tracking-wider uppercase">
                SCAN TO GET YOUR PHOTO
              </p>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute right-0 top-0 p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Hide QR card"
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
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center justify-center space-x-1 transition-all ${
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
                className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium flex items-center justify-center space-x-1 transition-all ${
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
          <div className="p-2 bg-white rounded-xl shadow-lg flex items-center justify-center">
            <img
              src={activeQr}
              alt="Real QR code to view and download result"
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
            />
          </div>

          {/* Direct link preview */}
          {activeUrl && (
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-amber-400/90 hover:underline max-w-[250px] truncate flex items-center space-x-1"
              title={activeUrl}
            >
              <span className="truncate">{activeUrl}</span>
              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            </a>
          )}

          {/* Buttons Row */}
          <div className="flex items-center space-x-2 w-full pt-0.5">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="flex-1 py-2 px-2.5 bg-[#e2b842] hover:bg-[#cfa532] active:scale-95 text-black font-extrabold text-[11px] sm:text-xs rounded-xl flex items-center justify-center space-x-1 shadow-md uppercase tracking-wider transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>DOWNLOAD</span>
            </button>

            {/* New Try-On Button */}
            <button
              onClick={onStartOver}
              className="flex-1 py-2 px-2.5 bg-[#202228] hover:bg-[#2c2f38] active:scale-95 text-white font-bold text-[11px] sm:text-xs rounded-xl border border-white/15 flex items-center justify-center space-x-1 shadow-md uppercase tracking-wider transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
              <span>NEW TRY-ON</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};

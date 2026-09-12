import React, { useState } from 'react';
import { QrCode, Smartphone, Wifi, Globe, RefreshCw, ExternalLink } from 'lucide-react';

interface QRCodePanelProps {
  qrDataUrl: string;
  lanQrDataUrl?: string;
  mobileUrl?: string;
  lanUrl?: string;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export const QRCodePanel: React.FC<QRCodePanelProps> = ({
  qrDataUrl,
  lanQrDataUrl,
  mobileUrl,
  lanUrl,
  title = 'Scan with Phone Camera',
  subtitle = 'Scan with your smartphone to connect',
  onRefresh,
}) => {
  const [networkMode, setNetworkMode] = useState<'tunnel' | 'lan'>('tunnel');

  const activeQr = networkMode === 'lan' && lanQrDataUrl ? lanQrDataUrl : qrDataUrl;
  const activeUrl = networkMode === 'lan' && lanUrl ? lanUrl : mobileUrl;

  return (
    <div className="glass-panel p-6 rounded-3xl border-2 border-gold-500/40 shadow-2xl flex flex-col items-center text-center max-w-sm">
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center space-x-2 text-gold-400 font-serif text-lg font-bold">
          <Smartphone className="w-5 h-5 text-[#dfb858]" />
          <span>{title}</span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-gold-400 transition-colors"
            title="Refresh QR Code"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-300 mb-3">{subtitle}</p>

      {/* Network Mode Toggle (if LAN fallback is present) */}
      {lanQrDataUrl && (
        <div className="flex items-center bg-black/50 p-1 rounded-xl border border-gold-500/30 mb-3 text-xs w-full">
          <button
            type="button"
            onClick={() => setNetworkMode('tunnel')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all ${
              networkMode === 'tunnel'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 mr-1" />
            <span>Mobile Data</span>
          </button>
          <button
            type="button"
            onClick={() => setNetworkMode('lan')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center space-x-1 transition-all ${
              networkMode === 'lan'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold shadow'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 mr-1" />
            <span>Store Wi-Fi</span>
          </button>
        </div>
      )}

      {/* QR Image Frame */}
      <div className="bg-white p-3.5 rounded-2xl shadow-xl border-4 border-gold-500/50 mb-3 inline-block">
        <img src={activeQr} alt="Scan QR Code" className="w-44 h-44 object-contain" />
      </div>

      {/* Direct link preview */}
      {activeUrl && (
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gold-400/90 hover:underline max-w-full truncate px-2 mb-2 flex items-center space-x-1"
          title={activeUrl}
        >
          <span className="truncate">{activeUrl}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      )}

      <div className="flex items-center space-x-2 text-xs text-gold-400/80 bg-royal-800/80 px-4 py-1.5 rounded-full border border-gold-500/20">
        <QrCode className="w-4 h-4" />
        <span>Scan with iOS / Android Camera</span>
      </div>
    </div>
  );
};


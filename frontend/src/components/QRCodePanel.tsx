import React from 'react';
import { QrCode, Smartphone } from 'lucide-react';

interface QRCodePanelProps {
  qrDataUrl: string;
  title?: string;
  subtitle?: string;
}

export const QRCodePanel: React.FC<QRCodePanelProps> = ({
  qrDataUrl,
  title = 'Scan to Get Your Photo',
  subtitle = 'Open your phone camera to download & share',
}) => {
  return (
    <div className="glass-panel p-6 rounded-3xl border-2 border-gold-500/40 shadow-2xl flex flex-col items-center text-center max-w-sm">
      <div className="flex items-center space-x-2 text-gold-400 font-serif text-lg font-bold mb-2">
        <Smartphone className="w-5 h-5" />
        <span>{title}</span>
      </div>
      <p className="text-xs text-gray-300 mb-4">{subtitle}</p>

      <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-gold-500/50 mb-4 inline-block">
        <img src={qrDataUrl} alt="Scan QR Code" className="w-48 h-48 object-contain" />
      </div>

      <div className="flex items-center space-x-2 text-xs text-gold-400/80 bg-royal-800/80 px-4 py-2 rounded-full border border-gold-500/20">
        <QrCode className="w-4 h-4" />
        <span>Scan with iOS / Android Camera</span>
      </div>
    </div>
  );
};

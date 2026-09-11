import React from 'react';
import { useKiosk } from '../context/KioskContext';
import { Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = true, onBack }) => {
  const { step, startNewExperience } = useKiosk();

  if (step === 'WELCOME') return null;

  return (
    <header className="w-full glass-panel px-8 py-5 flex items-center justify-between z-20 border-b border-gold-500/20 shadow-lg">
      <div className="flex items-center space-x-4">
        {showBack && (
          <button
            onClick={onBack || startNewExperience}
            className="p-3 rounded-2xl bg-royal-800/80 hover:bg-royal-700 text-gold-400 border border-gold-500/30 transition-all active:scale-90"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-7 h-7" />
          </button>
        )}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center border border-gold-400">
            <Sparkles className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wider gold-gradient-text">
              ROYAL AI STANDEE
            </h1>
            {title && <p className="text-xs text-gray-400 uppercase tracking-widest">{title}</p>}
          </div>
        </div>
      </div>

      <button
        onClick={startNewExperience}
        className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-sm font-semibold transition-all active:scale-95"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Start Over</span>
      </button>
    </header>
  );
};

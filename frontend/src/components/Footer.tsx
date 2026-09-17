import React from 'react';
import { useKiosk } from '../context/KioskContext';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { step } = useKiosk();
  const location = useLocation();
  const isWelcome = step === 'WELCOME' && (location.pathname === '/' || location.pathname === '/kiosk');

  return (
    <footer
      className={`w-full py-4 text-center text-xs tracking-widest uppercase border-t transition-colors ${
        isWelcome
          ? 'bg-[#121316] text-[#D8C29D]/90 border-[#D4AF37]/25 font-semibold'
          : 'border-gold-500/10 bg-royal-900/80 text-gold-400/60'
      }`}
    >
      <span>✨ Powered by AI Digital Standee Studio • High Resolution Virtual Try-On ✨</span>
    </footer>
  );
};

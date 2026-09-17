import React from 'react';
import { useKiosk } from '../context/KioskContext';
import { useLocation } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-3.5 text-center text-xs tracking-widest uppercase border-t border-[#D4AF37]/20 bg-[#0A0D14]/90 text-[#D8C29D]/80 font-medium">
      <span>✨ Powered by AI Digital Standee Studio • High Resolution Virtual Try-On ✨</span>
    </footer>
  );
};

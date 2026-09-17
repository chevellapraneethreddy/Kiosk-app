import React, { useState, useEffect } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Sparkles, HelpCircle, Globe, Play } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';

export const WelcomePage: React.FC = () => {
  const { setStep, initializeSession, sessionData } = useKiosk();
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Pre-warm session creation immediately when Welcome screen mounts
  useEffect(() => {
    if (!sessionData) {
      initializeSession().catch((err) => {
        console.warn('[WelcomePage] Session pre-warming in background:', err?.message || err);
      });
    }
  }, [sessionData, initializeSession]);

  const handleStart = () => {
    // Instantaneous screen transition on clicking "START VIRTUAL TRY-ON"
    setStep('CATEGORY_SELECT');
    if (!sessionData) {
      initializeSession().catch((err) => {
        console.warn('[WelcomePage] Background session initialization:', err?.message || err);
      });
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-4 md:p-6 lg:p-8 text-center bg-[#0A0D14] text-white overflow-hidden select-none">
      {/* Background Architectural Fashion-Tech Atmosphere */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[750px] bg-gradient-to-r from-[#D4AF37]/8 via-[#1C2235]/40 to-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-[#D4AF37]/5 blur-2xl pointer-events-none" />

      {/* Luxury Mall Kiosk Outer Framing Corner Brackets */}
      <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37]/35 pointer-events-none hidden md:block" />
      <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37]/35 pointer-events-none hidden md:block" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37]/35 pointer-events-none hidden md:block" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37]/35 pointer-events-none hidden md:block" />

      <div className="absolute top-7 left-16 text-[10px] font-mono tracking-[0.25em] text-[#D8C29D]/60 pointer-events-none hidden lg:block">
        MALL KIOSK // 1080P DIGITAL MIRROR
      </div>
      <div className="absolute top-7 right-16 text-[10px] font-mono tracking-[0.25em] text-[#D8C29D]/60 pointer-events-none hidden lg:block">
        INSTANT AI OUTFIT FIT
      </div>

      {/* Header Floating Pill Badge */}
      <div className="mt-1 md:mt-2 z-20 flex items-center space-x-3 px-6 py-2 rounded-full bg-[#121622]/90 border border-[#D4AF37]/40 text-white shadow-2xl backdrop-blur-md">
        <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
        <span className="text-xs md:text-sm font-semibold tracking-[0.22em] text-gray-200 uppercase">
          Men &amp; Women AI Virtual Try-On Standee
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      {/* LARGE ELEGANT WARM-WHITE / IVORY CENTRAL CONTENT PODIUM */}
      <div className="my-auto z-20 w-full max-w-4xl lg:max-w-5xl rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-10 bg-gradient-to-b from-[#FAF9F5] via-[#F6F4ED] to-[#EFECE3] text-[#0F1219] border-2 border-[#D4AF37]/50 shadow-[0_30px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(212,175,55,0.12)] relative overflow-hidden flex flex-col items-center">
        {/* Subtle Luxury Inner Framing Hairline */}
        <div className="absolute inset-2.5 md:inset-3 border border-[#D4AF37]/25 rounded-[1.75rem] md:rounded-[2.25rem] pointer-events-none" />

        {/* Sculpted Obsidian Medallion Crest with Champagne Gold Rim */}
        <div className="w-16 h-16 md:w-20 md:h-20 mb-3 md:mb-4 rounded-2xl bg-[#0F1219] border-2 border-[#D4AF37]/70 flex items-center justify-center shadow-2xl shadow-black/25 ring-4 ring-[#D4AF37]/15">
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#D4AF37]" />
        </div>

        {/* Hero Title: Deep Luxury Charcoal on Warm White */}
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-[#0F1219] uppercase mb-2 leading-[1.05] text-center drop-shadow-sm">
          REAL VIRTUAL TRY-ON
        </h1>

        {/* Subtle Champagne Gold Jewelry Divider */}
        <div className="flex items-center justify-center space-x-4 mb-4 md:mb-5">
          <span className="w-14 md:w-20 h-[1.5px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
          <span className="w-2.5 h-2.5 rotate-45 border border-[#D4AF37] bg-[#D4AF37]/30" />
          <span className="w-14 md:w-20 h-[1.5px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
        </div>

        {/* Subtitle in Charcoal Slate */}
        <p className="text-sm md:text-base lg:text-lg font-normal text-[#3E424F] tracking-wide mb-5 md:mb-6 max-w-3xl text-center leading-relaxed font-sans">
          Hold your saree, dress, shirt, t-shirt, kurtha or pants in front of the camera and see yourself wearing it in real-time AI output!
        </p>

        {/* Fashion Collection Preview Chips (Fills spatial composition with rich retail context) */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-6 md:mb-7 max-w-2xl">
          {[
            { name: 'Saree', icon: '🥻', gender: 'Women' },
            { name: 'Dress', icon: '👗', gender: 'Women' },
            { name: 'Shirt', icon: '👔', gender: 'Men' },
            { name: 'T-Shirt', icon: '👕', gender: 'Men' },
            { name: 'Pant', icon: '👖', gender: 'Men' },
            { name: 'Kurtha', icon: '✨', gender: 'Men' },
          ].map((item) => (
            <div
              key={item.name}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#111317]/5 border border-[#111317]/15 text-[#1A1D24] text-xs md:text-sm font-bold tracking-wide shadow-sm"
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
              <span className="text-[10px] uppercase font-semibold text-[#8C7A58] pl-1">
                {item.gender}
              </span>
            </div>
          ))}
        </div>

        {/* Large Touchscreen CTA with Subtle Champagne Gold Treatment */}
        <button
          onClick={handleStart}
          className="group relative z-30 flex items-center justify-center space-x-4 py-4 md:py-5 px-10 md:px-14 rounded-full text-lg md:text-xl font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#DFCCA6] via-[#D4AF37] to-[#C49826] text-[#0F1219] border-2 border-[#BFA06B] shadow-[0_16px_50px_rgba(212,175,55,0.45)] hover:shadow-[0_20px_65px_rgba(212,175,55,0.65)]"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#0F1219] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 md:w-5 md:h-5 fill-[#D4AF37] text-[#D4AF37] ml-0.5" />
          </div>
          <span>START VIRTUAL TRY-ON</span>
        </button>
      </div>

      {/* Secondary Controls on Deep Midnight Deck */}
      <div className="mt-4 md:mt-5 mb-1 z-20 flex items-center space-x-6">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center space-x-2.5 px-6 py-2.5 md:py-3 rounded-2xl bg-[#121622]/90 text-white border border-white/10 hover:border-[#D4AF37]/60 text-sm md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-md"
        >
          <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
          <span>How It Works</span>
        </button>

        <button
          onClick={() => alert('Language selection: English default')}
          className="flex items-center space-x-2.5 px-6 py-2.5 md:py-3 rounded-2xl bg-[#121622]/90 text-white border border-white/10 hover:border-[#D4AF37]/60 text-sm md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-md"
        >
          <Globe className="w-5 h-5 text-[#D4AF37]" />
          <span>English</span>
        </button>
      </div>

      {/* How It Works Modal */}
      <Modal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} title="How Real Virtual Try-On Works">
        <ol className="space-y-6 list-decimal list-inside text-gray-200 text-left">
          <li>
            <strong className="text-gold-400">Stand In Front of Camera:</strong> Stand in front of the vertical screen display.
          </li>
          <li>
            <strong className="text-gold-400">Hold Your Garment:</strong> Hold your saree, dress, shirt, t-shirt, kurtha or pants clearly in front of the camera.
          </li>
          <li>
            <strong className="text-gold-400">Capture Photo:</strong> Click "CAPTURE PHOTO" to capture yourself holding your garment.
          </li>
          <li>
            <strong className="text-gold-400">AI Garment Extraction &amp; Try-On:</strong> Our AI automatically extracts your held garment and fits it seamlessly onto your portrait.
          </li>
          <li>
            <strong className="text-gold-400">Scan &amp; Phone Download:</strong> Scan the real QR code with your smartphone to open, view, and save your photo!
          </li>
        </ol>
      </Modal>
    </div>
  );
};

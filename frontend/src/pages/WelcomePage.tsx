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
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-6 md:p-10 text-center bg-[#FAF9F6] text-[#111317] overflow-hidden select-none">
      {/* Background Architectural Atmosphere: Soft warm white with subtle champagne aura */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[550px] bg-gradient-to-b from-[#F2ECE1] via-[#EFE7D8]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Subtle luxury architectural hairline framing for high-end mall installation */}
      <div className="absolute inset-4 md:inset-8 border border-[#E7E2D6]/80 rounded-[2.5rem] pointer-events-none" />
      <div className="absolute top-6 md:top-10 left-6 md:left-10 text-[10px] uppercase font-mono tracking-[0.3em] text-[#A69F91] pointer-events-none">
        MALL KIOSK // FASHION-TECH
      </div>
      <div className="absolute top-6 md:top-10 right-6 md:right-10 text-[10px] uppercase font-mono tracking-[0.3em] text-[#A69F91] pointer-events-none">
        1080P ROYAL MIRROR
      </div>

      {/* Header Badge: Dark Charcoal Pill with Champagne Gold Accent */}
      <div className="mt-6 md:mt-8 z-20 flex items-center space-x-2.5 px-6 py-2.5 rounded-full bg-[#121316] border border-[#D4AF37]/35 text-white shadow-xl shadow-black/10">
        <Sparkles className="w-4 h-4 text-[#D4AF37] animate-spin-slow" />
        <span className="text-xs md:text-sm font-semibold tracking-[0.2em] text-gray-100 uppercase">
          Men &amp; Women AI Virtual Try-On Standee
        </span>
      </div>

      {/* Center Welcome Hero Title */}
      <div className="my-auto z-20 flex flex-col items-center max-w-4xl px-4">
        {/* Medallion Icon */}
        <div className="w-20 h-20 md:w-24 md:h-24 mb-6 rounded-full bg-[#121316] border-2 border-[#D4AF37]/60 flex items-center justify-center shadow-[0_12px_30px_rgba(18,19,22,0.18)] ring-4 ring-[#D4AF37]/15">
          <Sparkles className="w-10 h-10 md:w-11 md:h-11 text-[#D4AF37]" />
        </div>

        {/* Hero Title: Deep Luxury Charcoal on Warm White */}
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#111317] uppercase mb-3 leading-[1.05] drop-shadow-sm">
          REAL VIRTUAL TRY-ON
        </h1>

        {/* Subtle Champagne Gold Jewelry Divider */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <span className="w-12 md:w-16 h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
          <span className="w-2 h-2 rotate-45 border border-[#D4AF37] bg-[#D4AF37]/30" />
          <span className="w-12 md:w-16 h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
        </div>

        {/* Subtitle in Charcoal */}
        <p className="text-base md:text-xl font-normal text-[#484D59] tracking-wide mb-10 md:mb-12 max-w-2xl leading-relaxed">
          Hold your saree, dress, shirt, t-shirt, kurtha or pants in front of the camera and see yourself wearing it in real-time AI output!
        </p>

        {/* Large Touchscreen CTA with Subtle Champagne Gold Treatment */}
        <button
          onClick={handleStart}
          className="group relative z-20 flex items-center justify-center space-x-4 py-5 md:py-6 px-10 md:px-14 rounded-full text-lg md:text-xl font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#DFCCA6] via-[#D4AF37] to-[#C49826] text-[#111317] border border-[#BFA06B]/60 shadow-[0_16px_40px_rgba(212,175,55,0.35)] hover:shadow-[0_20px_50px_rgba(212,175,55,0.5)]"
        >
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#111317] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 md:w-5 md:h-5 fill-[#D4AF37] text-[#D4AF37] ml-0.5" />
          </div>
          <span>START VIRTUAL TRY-ON</span>
        </button>
      </div>

      {/* Secondary Controls: Dark Charcoal Pills with White Text & Champagne Icons */}
      <div className="mb-6 z-20 flex items-center space-x-5">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center space-x-2.5 px-6 md:px-7 py-3 md:py-3.5 rounded-2xl bg-[#121316] text-white border border-[#121316] hover:border-[#D4AF37]/50 text-sm md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
        >
          <HelpCircle className="w-5 h-5 text-[#D4AF37]" />
          <span>How It Works</span>
        </button>

        <button
          onClick={() => alert('Language selection: English default')}
          className="flex items-center space-x-2.5 px-6 md:px-7 py-3 md:py-3.5 rounded-2xl bg-[#121316] text-white border border-[#121316] hover:border-[#D4AF37]/50 text-sm md:text-base font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
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

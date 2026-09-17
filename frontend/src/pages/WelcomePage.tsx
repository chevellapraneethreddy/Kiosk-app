import React, { useState, useEffect } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Sparkles, HelpCircle, Globe, Play, ArrowRight, Camera, ShoppingBag, Shirt } from 'lucide-react';
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
    <div className="relative w-full h-screen flex flex-col justify-between bg-[#07090E] text-white overflow-hidden select-none">
      {/* Upper Mall Showroom Environment (Side Flanking Arches + Center Lightbox) */}
      <div className="relative flex-1 w-full flex items-stretch justify-between overflow-hidden">
        
        {/* LEFT FLANKING DISPLAY: Male Model in Luxury Suiting Arch */}
        <div className="hidden lg:flex w-[23%] xl:w-[24%] 2xl:w-[25%] h-full relative overflow-hidden flex-shrink-0 select-none pointer-events-none">
          <img
            src="/kiosk_left_arch_clean.png"
            alt="Luxury Men's Couture Display"
            className="w-full h-full object-cover object-right shadow-[15px_0_35px_rgba(0,0,0,0.85)]"
          />
          {/* Soft architectural vignette transition into center */}
          <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-[#07090E]/80 pointer-events-none" />
        </div>

        {/* CENTER LUXURY SHOWCASE COLUMN */}
        <div className="flex-1 h-full flex flex-col items-center justify-between px-3 md:px-6 py-2.5 relative z-10 max-w-[840px] xl:max-w-[900px] 2xl:max-w-[950px] mx-auto">
          
          {/* Ambient Warm Golden Backlight behind center podium */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] bg-gradient-to-r from-[#D4AF37]/12 via-[#1D253A]/30 to-[#D4AF37]/12 rounded-full blur-3xl pointer-events-none" />

          {/* Floating Header Badge */}
          <div className="mt-1 md:mt-2 z-20 flex items-center space-x-2.5 px-6 py-1.5 rounded-full bg-[#0C0F17]/95 border border-[#D4AF37]/50 text-white shadow-2xl backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.25em] text-gray-100 uppercase">
              Men &amp; Women AI Virtual Try-On Standee
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          </div>

          {/* LARGE WARM-IVORY / ALABASTER CENTRAL LIGHTBOX PODIUM */}
          <div className="my-auto z-20 w-full rounded-[2.25rem] md:rounded-[2.75rem] p-5 md:p-7 lg:p-8 bg-gradient-to-b from-[#FAF8F3] via-[#F6F2EA] to-[#EEE8DC] text-[#0E1118] border-2 border-[#D4AF37]/60 shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_60px_rgba(212,175,55,0.18)] relative overflow-hidden flex flex-col items-center">
            
            {/* Subtle Luxury Hairline Inner Frame */}
            <div className="absolute inset-2 md:inset-2.5 border border-[#D4AF37]/30 rounded-[1.85rem] md:rounded-[2.35rem] pointer-events-none" />

            {/* Sculpted Obsidian Medallion Crest with Champagne Star */}
            <div className="w-14 h-14 md:w-16 md:h-16 mb-2 rounded-2xl bg-[#0C0F17] border-2 border-[#D4AF37]/80 flex items-center justify-center shadow-xl shadow-black/30 ring-4 ring-[#D4AF37]/15">
              <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF37]" />
            </div>

            {/* Headline: REAL VIRTUAL in Charcoal, TRY-ON in Gold */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase mb-0.5 leading-none text-center">
              <span className="text-[#0E1118] block drop-shadow-sm">REAL VIRTUAL</span>
              <span className="bg-gradient-to-r from-[#C99C35] via-[#E8CB7E] to-[#B88A24] bg-clip-text text-transparent block mt-1 drop-shadow-sm">
                TRY-ON
              </span>
            </h1>

            {/* Jewelry Diamond Divider */}
            <div className="flex items-center justify-center space-x-3 my-2 md:my-2.5">
              <span className="w-12 md:w-16 h-[1.5px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
              <span className="w-2.5 h-2.5 rotate-45 border border-[#D4AF37] bg-[#D4AF37]/40" />
              <span className="w-12 md:w-16 h-[1.5px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
            </div>

            {/* Subtitle in Charcoal Slate */}
            <p className="text-xs md:text-sm font-normal text-[#3E424F] tracking-wide mb-4 md:mb-5 max-w-xl text-center leading-relaxed font-sans">
              Hold your saree, dress, shirt, t-shirt, kurtha or pants in front of the camera and see yourself wearing it in real-time AI output!
            </p>

            {/* Collection Category Chips */}
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
                {[
                  { name: 'Saree', icon: '🥻', gender: 'Women' },
                  { name: 'Dress', icon: '👗', gender: 'Women' },
                  { name: 'Shirt', icon: '👔', gender: 'Men' },
                  { name: 'T-Shirt', icon: '👕', gender: 'Men' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/80 border border-[#D4AF37]/40 text-[#151820] text-xs md:text-sm font-bold tracking-wide shadow-sm"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-[#8E784C] pl-1">
                      {item.gender}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5">
                {[
                  { name: 'Pant', icon: '👖', gender: 'Men' },
                  { name: 'Kurtha', icon: '✨', gender: 'Men' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/80 border border-[#D4AF37]/40 text-[#151820] text-xs md:text-sm font-bold tracking-wide shadow-sm"
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <span className="text-[10px] uppercase font-semibold text-[#8E784C] pl-1">
                      {item.gender}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Champagne Gold Glowing CTA Button */}
            <button
              onClick={handleStart}
              className="group relative z-30 flex items-center justify-center space-x-3.5 py-3.5 md:py-4 px-10 md:px-14 rounded-full text-lg md:text-xl font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#F0DFB8] via-[#DDB85A] to-[#BE8E28] text-[#0C0F17] border-2 border-[#FFEBB3] shadow-[0_12px_35px_rgba(212,175,55,0.45),0_0_25px_rgba(212,175,55,0.25)] hover:shadow-[0_16px_50px_rgba(212,175,55,0.65)]"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#0C0F17] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37] ml-0.5" />
              </div>
              <span>START VIRTUAL TRY-ON</span>
              <ArrowRight className="w-5 h-5 text-[#0C0F17] stroke-[2.5] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Secondary Controls on Marble Floor Reflection Deck */}
          <div className="mt-2 md:mt-3 mb-1 z-20 flex items-center space-x-5">
            <button
              onClick={() => setIsHowItWorksOpen(true)}
              className="flex items-center space-x-2 px-6 py-2 rounded-2xl bg-[#0C0F17]/90 text-white border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs md:text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-md"
            >
              <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>How It Works</span>
            </button>

            <button
              onClick={() => alert('Language selection: English default')}
              className="flex items-center space-x-2 px-6 py-2 rounded-2xl bg-[#0C0F17]/90 text-white border border-[#D4AF37]/40 hover:border-[#D4AF37] text-xs md:text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-md"
            >
              <Globe className="w-4 h-4 text-[#D4AF37]" />
              <span>English</span>
            </button>
          </div>
        </div>

        {/* RIGHT FLANKING DISPLAY: Female Model in Couture Evening Arch */}
        <div className="hidden lg:flex w-[25%] xl:w-[26%] 2xl:w-[27%] h-full relative overflow-hidden flex-shrink-0 select-none pointer-events-none">
          <img
            src="/kiosk_right_arch_clean.png"
            alt="Luxury Women's Couture Display"
            className="w-full h-full object-cover object-left shadow-[-15px_0_35px_rgba(0,0,0,0.85)]"
          />
          {/* Soft architectural vignette transition into center */}
          <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-l from-transparent to-[#07090E]/80 pointer-events-none" />
        </div>
      </div>

      {/* BOTTOM ANCHOR KIOSK TICKER BAR */}
      <div className="w-full h-11 md:h-12 z-30 bg-[#07090E] border-t border-[#D4AF37]/25 flex items-center justify-between px-6 md:px-12 text-[11px] md:text-xs tracking-wider text-gray-300 select-none">
        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="flex items-center space-x-2">
            <Shirt className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-semibold tracking-widest text-gray-200">REAL OUTFITS</span>
          </div>
          <span className="text-[#D4AF37]/40">|</span>
          <div className="flex items-center space-x-2">
            <Camera className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-semibold tracking-widest text-gray-200">REAL-TIME AI</span>
          </div>
          <span className="text-[#D4AF37]/40">|</span>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-semibold tracking-widest text-gray-200">SHOP SMARTER</span>
          </div>
          <span className="text-[#D4AF37]/40 hidden md:inline">|</span>
          <div className="hidden md:flex items-center space-x-2">
            <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-semibold tracking-widest text-gray-200">A MORE SUSTAINABLE YOU</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.25em] text-[#D4AF37]/90 font-bold border-b border-[#D4AF37]/70 pb-0.5">
            AI FASHION KIOSK
          </span>
        </div>
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

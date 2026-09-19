import React, { useState, useEffect } from 'react';
import { useKiosk } from '../context/KioskContext';
import { FashionGender, FashionCategory } from '../types';
import { Play, ArrowRight } from 'lucide-react';

interface OutfitCard {
  id: FashionCategory;
  name: string;
  gender: FashionGender;
}

const OUTFIT_CARDS: OutfitCard[] = [
  { id: 'Saree', name: 'Saree', gender: 'WOMEN' },
  { id: 'Dress', name: 'Dress', gender: 'WOMEN' },
  { id: 'Shirt', name: 'Shirt', gender: 'MEN' },
  { id: 'T-Shirt', name: 'T-Shirt', gender: 'MEN' },
  { id: 'Pant', name: 'Pant', gender: 'MEN' },
  { id: 'Kurtha', name: 'Kurtha', gender: 'MEN' },
];

export const WelcomePage: React.FC = () => {
  const {
    setStep,
    initializeSession,
    sessionData,
    selectedGender,
    setSelectedGender,
    selectedCategory,
    setSelectedCategory,
  } = useKiosk();

  // Active selected outfit (default to current context or 'Shirt' for Men)
  const [activeOutfit, setActiveOutfit] = useState<OutfitCard>(() => {
    if (selectedCategory && selectedGender) {
      const found = OUTFIT_CARDS.find((c) => c.id === selectedCategory && c.gender === selectedGender);
      if (found) return found;
    }
    return OUTFIT_CARDS[2]; // Default: Shirt (MEN)
  });

  // Pre-warm session creation immediately when Welcome screen mounts
  useEffect(() => {
    if (!sessionData) {
      initializeSession().catch((err) => {
        console.warn('[WelcomePage] Session pre-warming in background:', err?.message || err);
      });
    }
  }, [sessionData, initializeSession]);

  const handleSelectCard = (outfit: OutfitCard) => {
    setActiveOutfit(outfit);
    setSelectedGender(outfit.gender);
    setSelectedCategory(outfit.id);
  };

  const handleProceedToCategory = (outfit: OutfitCard) => {
    setSelectedGender(outfit.gender);
    setSelectedCategory(outfit.id);
    setStep('CATEGORY_SELECT');
    if (!sessionData) {
      initializeSession().catch((err) => {
        console.warn('[WelcomePage] Background session initialization:', err?.message || err);
      });
    }
  };

  const handleMainCta = () => {
    handleProceedToCategory(activeOutfit);
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FAF8F3] via-[#F6F2EA] to-[#EEE8DC] text-[#111827] select-none overflow-x-hidden p-6 md:p-10">
      {/* Ambient Warm Golden Backlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-r from-[#D4AF37]/15 via-[#E6C670]/20 to-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER SECTION */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex items-start justify-between pt-2 pb-4">
        {/* TOP LEFT: TRONX LOGO */}
        <div className="flex flex-col items-start">
          <div className="flex items-baseline space-x-0.5">
            <span className="font-sans text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
              TRON
            </span>
            <span className="font-sans text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-tr from-[#D4AF37] via-[#E8CB7E] to-[#B88A24] bg-clip-text text-transparent">
              X
            </span>
          </div>
          <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] text-[#71717A] uppercase mt-0.5">
            FASHION &times; AI &times; PEOPLE
          </span>
        </div>

        {/* TOP RIGHT: SMART FASHION MOTTO */}
        <div className="flex items-center space-x-3 text-left">
          <div className="w-[2.5px] h-11 bg-gradient-to-b from-[#C99C35] via-[#E8CB7E] to-[#B88A24] rounded-full" />
          <div className="flex flex-col text-[10px] md:text-xs font-bold tracking-[0.18em] text-[#52525B] uppercase leading-snug">
            <span>SMART FASHION</span>
            <span>SMARTER PEOPLE</span>
            <span>BRIGHTER TOMORROW</span>
          </div>
        </div>
      </header>

      {/* CENTER SHOWCASE & CATEGORY GRID */}
      <main className="relative z-20 flex-1 w-full max-w-6xl mx-auto flex flex-col items-center justify-center my-auto py-2">
        {/* MAIN HEADLINE BLOCK */}
        <div className="text-center mb-6 md:mb-8 space-y-1.5 max-w-3xl">
          {/* Gender pill/divider */}
          <div className="flex items-center justify-center space-x-3 mb-2">
            <span className="w-10 md:w-14 h-[1.5px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <span className="text-xs md:text-sm font-bold tracking-[0.3em] text-[#9A7938] uppercase">
              MEN &amp; WOMEN
            </span>
            <span className="w-10 md:w-14 h-[1.5px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>

          {/* REAL VIRTUAL TRY-ON Headline */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-none">
            <span className="text-[#111827] block drop-shadow-sm">REAL VIRTUAL</span>
            <span className="bg-gradient-to-r from-[#B48425] via-[#DDB85A] to-[#9C7015] bg-clip-text text-transparent block mt-1 drop-shadow-sm">
              TRY-ON
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs md:text-sm font-bold tracking-[0.25em] text-[#52525B] uppercase pt-1">
            SEE YOUR STYLE BEFORE YOU BUY
          </p>

          {/* Jewelry Diamond / Gold Accent Divider */}
          <div className="flex items-center justify-center space-x-3 my-2.5">
            <span className="w-10 h-[1.5px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <span className="w-2 h-2 rotate-45 border border-[#D4AF37] bg-[#D4AF37]/50" />
            <span className="w-10 h-[1.5px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>

          {/* Instruction */}
          <p className="text-xs md:text-sm text-[#4B5563] font-normal leading-relaxed max-w-xl mx-auto px-4">
            Hold your saree, dress, shirt, t-shirt, kurtha or pants in front of the camera and see yourself wearing it in real-time AI output!
          </p>
        </div>

        {/* 6 INTERACTIVE OUTFIT CARDS (3x2 GRID) */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-3.5 md:gap-4 mb-8 px-4">
          {OUTFIT_CARDS.map((item) => {
            const isSelected = activeOutfit.id === item.id && activeOutfit.gender === item.gender;
            return (
              <div
                key={`${item.gender}-${item.id}`}
                onClick={() => handleSelectCard(item)}
                onDoubleClick={() => handleProceedToCategory(item)}
                className={`relative rounded-2xl md:rounded-3xl p-4 md:p-5 border transition-all duration-300 flex items-center justify-between cursor-pointer group select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-white via-[#FFFBF2] to-[#FFF8EA] border-[#B48425] shadow-[0_8px_30px_rgba(212,175,55,0.3)] ring-2 ring-[#D4AF37]/40 scale-[1.02]'
                    : 'bg-white/95 border-[#E6D8BA] hover:border-[#C59B37] shadow-[0_4px_18px_rgba(212,175,55,0.08)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.2)] hover:scale-[1.01]'
                }`}
              >
                {/* Left: Garment Title & Gender */}
                <div className="flex flex-col text-left">
                  <h3 className="font-serif text-2xl md:text-3xl font-black text-[#111827] group-hover:text-[#9A7938] transition-colors leading-tight">
                    {item.name}
                  </h3>
                  <span className="text-[11px] md:text-xs font-bold tracking-[0.2em] text-[#9A7938] uppercase mt-0.5">
                    {item.gender}
                  </span>
                </div>

                {/* Right: Vertical Divider & Arrow Button */}
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-9 w-[1px] transition-colors ${
                      isSelected ? 'bg-[#D4AF37]' : 'bg-[#E6D8BA] group-hover:bg-[#C59B37]/60'
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProceedToCategory(item);
                    }}
                    title={`Try on ${item.name}`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#B48425] text-white shadow-md'
                        : 'text-[#9A7938] group-hover:text-[#7A5B18] group-hover:translate-x-0.5'
                    }`}
                  >
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* PRIMARY CTA: GLOWING GOLD CAPSULE BUTTON */}
        <button
          onClick={handleMainCta}
          className="group relative z-30 flex items-center justify-center space-x-3.5 py-4 md:py-5 px-10 md:px-14 rounded-full text-base md:text-lg font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] border-2 border-[#FFF0C7] shadow-[0_12px_35px_rgba(212,175,55,0.45)] hover:shadow-[0_18px_50px_rgba(212,175,55,0.65)]"
        >
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#111827] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          </div>
          <div className="h-6 w-[1.5px] bg-[#111827]/20 mx-1" />
          <span className="tracking-widest">START VIRTUAL TRY-ON</span>
          <ArrowRight className="w-5 h-5 text-[#111827] stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
        </button>
      </main>

      {/* BOTTOM FOOTER TICKER / SLOGANS */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto flex items-end justify-between pt-6 pb-2 border-t border-[#D4AF37]/30 text-[#71717A]">
        {/* Bottom Left: SUSTAINABLE FASHION */}
        <div className="flex items-start space-x-2 text-left">
          <span className="text-[#D4AF37] font-bold text-sm leading-none mt-0.5">&mdash;</span>
          <div className="flex flex-col text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase leading-tight">
            <span>SUSTAINABLE</span>
            <span>FASHION</span>
            <span>REAL IMPACT</span>
          </div>
        </div>

        {/* Bottom Center: Powered by TRONX */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center space-x-2 text-xs md:text-sm font-bold tracking-wider text-[#374151]">
            <span className="w-6 h-[1px] bg-[#D4AF37]" />
            <span>Powered by</span>
            <span className="font-black text-[#111827]">TRON</span>
            <span className="font-black text-[#D4AF37] -ml-1">X</span>
            <span className="w-6 h-[1px] bg-[#D4AF37]" />
          </div>
          <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] text-[#9CA3AF] uppercase mt-0.5">
            TECHNOLOGY FOR A SMARTER FASHION FUTURE
          </span>
        </div>

        {/* Bottom Right: REAL OUTFITS */}
        <div className="flex items-start space-x-2 text-right justify-end">
          <div className="flex flex-col text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase leading-tight">
            <span>REAL OUTFITS</span>
            <span>REAL PEOPLE</span>
            <span>REAL POSSIBILITIES</span>
          </div>
          <span className="text-[#D4AF37] font-bold text-sm leading-none mt-0.5">&mdash;</span>
        </div>
      </footer>
    </div>
  );
};

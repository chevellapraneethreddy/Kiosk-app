import React, { useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { FashionGender, FashionCategory } from '../types';
import { ArrowLeft, ArrowRight, Check, Play, Sparkles, ShieldCheck, Shirt } from 'lucide-react';

interface GarmentOption {
  id: FashionCategory;
  name: string;
  subtitle: string;
  description: string;
}

const WOMEN_GARMENTS: GarmentOption[] = [
  {
    id: 'Saree',
    name: 'Saree',
    subtitle: 'SILK, BANARASI & DESIGNER',
    description: 'Authentic diagonal pallu, matching blouse, waist pleats & floor-length drape.',
  },
  {
    id: 'Dress',
    name: 'Dress',
    subtitle: 'GOWN, FROCK & KURTI',
    description: 'Graceful feminine silhouette, tailored bustline and flowy elegant hem.',
  },
];

const MEN_GARMENTS: GarmentOption[] = [
  {
    id: 'Shirt',
    name: 'Shirt',
    subtitle: 'BUTTON-UP & COLLARED',
    description: 'Crisp collar, buttons, full sleeves down to cuffs, tailored torso fit.',
  },
  {
    id: 'T-Shirt',
    name: 'T-Shirt',
    subtitle: 'CREWNECK & CASUAL TEE',
    description: 'Comfortable crewneck, relaxed fit, uniform reference fabric drape.',
  },
  {
    id: 'Pant',
    name: 'Pant',
    subtitle: 'TROUSERS, CHINOS & JEANS',
    description: 'Tailored waistline, fly, pockets, and straight leg drape down to shoes.',
  },
  {
    id: 'Kurtha',
    name: 'Kurtha',
    subtitle: "TRADITIONAL MEN'S KURTA",
    description: 'Classic long tunic, mandarin collar, festive ethnic wear past knees.',
  },
];

export const CategorySelectionPage: React.FC = () => {
  const {
    selectedGender,
    setSelectedGender,
    selectedCategory,
    setSelectedCategory,
    setStep,
  } = useKiosk();

  const [activeGender, setActiveGender] = useState<FashionGender>(selectedGender || 'WOMEN');
  const [activeCategory, setActiveCategory] = useState<FashionCategory | null>(
    selectedGender === (selectedGender || 'WOMEN') ? selectedCategory : (selectedGender === 'MEN' ? 'Shirt' : 'Saree')
  );

  const handleGenderSwitch = (gender: FashionGender) => {
    setActiveGender(gender);
    setSelectedGender(gender);
    // Auto-select first outfit of that gender
    const defaultOutfit = gender === 'MEN' ? 'Shirt' : 'Saree';
    setActiveCategory(defaultOutfit);
    setSelectedCategory(defaultOutfit);
  };

  const handleCategorySelect = (category: FashionCategory) => {
    setActiveCategory(category);
    setSelectedGender(activeGender);
    setSelectedCategory(category);
  };

  const handleStartVirtualTryOn = () => {
    if (!activeCategory) return;
    setSelectedGender(activeGender);
    setSelectedCategory(activeCategory);
    setStep('LIVE_STANDEE');
  };

  const currentGarments = activeGender === 'MEN' ? MEN_GARMENTS : WOMEN_GARMENTS;

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FAF8F3] via-[#F6F2EA] to-[#EEE8DC] text-[#111827] select-none overflow-x-hidden p-6 md:p-10">
      {/* Ambient Warm Golden Backlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[460px] bg-gradient-to-r from-[#D4AF37]/12 via-[#E6C670]/18 to-[#D4AF37]/12 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER SECTION */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between pb-4 border-b border-[#D4AF37]/30">
        {/* BACK BUTTON */}
        <button
          onClick={() => setStep('WELCOME')}
          className="flex items-center space-x-2 px-5 py-2 rounded-full bg-white/90 border border-[#D4AF37]/60 text-[#111827] hover:bg-white text-xs md:text-sm font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#B48425] stroke-[2.5]" />
          <span>BACK</span>
        </button>

        {/* FASHION CATEGORY SELECTION BADGE */}
        <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/90 border border-[#D4AF37]/60 text-[#111827] text-xs font-bold tracking-widest uppercase shadow-sm">
          <Sparkles className="w-4 h-4 text-[#B48425]" />
          <span>FASHION CATEGORY SELECTION</span>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-20 flex-1 w-full max-w-6xl mx-auto flex flex-col items-center justify-center my-auto py-4">
        {/* MAIN HEADLINE */}
        <div className="text-center mb-6 space-y-1.5 max-w-3xl">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-none">
            <span className="text-[#111827] block drop-shadow-sm">CHOOSE YOUR</span>
            <span className="bg-gradient-to-r from-[#B48425] via-[#DDB85A] to-[#9C7015] bg-clip-text text-transparent block mt-1 drop-shadow-sm">
              CATEGORY
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[#52525B] font-medium tracking-wide mt-2">
            Select your gender and outfit to begin your AI virtual try-on experience
          </p>
        </div>

        {/* GENDER SELECTOR CARDS (WOMEN & MEN) */}
        <div className="w-full max-w-4xl grid grid-cols-2 gap-5 md:gap-6 mb-7 px-4">
          {/* WOMEN SELECTOR */}
          <button
            onClick={() => handleGenderSwitch('WOMEN')}
            className={`relative rounded-2xl md:rounded-3xl p-5 md:p-6 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
              activeGender === 'WOMEN'
                ? 'bg-gradient-to-b from-white via-[#FFFDF8] to-[#FFF9EE] border-2 border-[#B48425] shadow-[0_8px_30px_rgba(212,175,55,0.28)] ring-2 ring-[#D4AF37]/30 scale-[1.01]'
                : 'bg-white/85 border border-[#E6D8BA] hover:border-[#C59B37] shadow-sm hover:shadow-md'
            }`}
          >
            {activeGender === 'WOMEN' && (
              <span className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#B48425] flex items-center justify-center shadow-md">
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </span>
            )}

            {/* Stylized Avatar Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-b from-[#FDF8EE] to-[#F5E8CB] border border-[#E0D0A8] flex items-center justify-center mb-2.5 shadow-inner group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B48425"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-9 h-9 md:w-11 md:h-11"
              >
                {/* Stylized woman portrait with flowing hair */}
                <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5c0 2.5-2 4.5-4.5 4.5S7.5 10 7.5 7.5A4.5 4.5 0 0 1 12 3z" />
                <path d="M7 11c-2.5 1-4 3.5-4 6.5v1.5h18V17.5c0-3-1.5-5.5-4-6.5" />
                <path d="M8 8c0 3 1.5 5 4 5s4-2 4-5" />
              </svg>
            </div>

            <span className="font-serif text-2xl md:text-3xl font-black tracking-wider uppercase text-[#111827]">
              WOMEN
            </span>
            <span className="text-xs md:text-sm font-bold tracking-widest text-[#B48425] uppercase mt-1">
              SAREE &bull; DRESS
            </span>
          </button>

          {/* MEN SELECTOR */}
          <button
            onClick={() => handleGenderSwitch('MEN')}
            className={`relative rounded-2xl md:rounded-3xl p-5 md:p-6 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer select-none group ${
              activeGender === 'MEN'
                ? 'bg-gradient-to-b from-white via-[#FFFDF8] to-[#FFF9EE] border-2 border-[#B48425] shadow-[0_8px_30px_rgba(212,175,55,0.28)] ring-2 ring-[#D4AF37]/30 scale-[1.01]'
                : 'bg-white/85 border border-[#E6D8BA] hover:border-[#C59B37] shadow-sm hover:shadow-md'
            }`}
          >
            {activeGender === 'MEN' && (
              <span className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-[#B48425] flex items-center justify-center shadow-md">
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              </span>
            )}

            {/* Stylized Avatar Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-b from-[#FDF8EE] to-[#F5E8CB] border border-[#E0D0A8] flex items-center justify-center mb-2.5 shadow-inner group-hover:scale-105 transition-transform">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={activeGender === 'MEN' ? '#B48425' : '#6B7280'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-9 h-9 md:w-11 md:h-11"
              >
                {/* Stylized man portrait */}
                <path d="M12 3a4 4 0 0 1 4 4c0 2.2-1.8 4-4 4s-4-1.8-4-4a4 4 0 0 1 4-4z" />
                <path d="M6 19.5c0-3.5 2.7-6.5 6-6.5s6 3 6 6.5" />
                <path d="M9 19.5v2h6v-2" />
              </svg>
            </div>

            <span className="font-serif text-2xl md:text-3xl font-black tracking-wider uppercase text-[#111827]">
              MEN
            </span>
            <span
              className={`text-xs md:text-sm font-bold tracking-widest uppercase mt-1 ${
                activeGender === 'MEN' ? 'text-[#B48425]' : 'text-[#6B7280]'
              }`}
            >
              SHIRT &bull; T-SHIRT &bull; PANT &bull; KURTHA
            </span>
          </button>
        </div>

        {/* SECTION HEADER BAR */}
        <div className="flex items-center justify-between mb-4 px-4 w-full max-w-4xl mx-auto">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#B48425]" />
            <span className="text-xs md:text-sm font-black tracking-widest text-[#111827] uppercase whitespace-nowrap">
              AVAILABLE {activeGender} OUTFITS ({currentGarments.length})
            </span>
          </div>

          <div className="h-[1.5px] bg-[#D4AF37]/40 flex-1 mx-4 hidden md:block" />

          <span className="text-[11px] md:text-xs text-[#71717A] font-medium tracking-wide whitespace-nowrap">
            Categories are strictly isolated &bull; Never mixed
          </span>
        </div>

        {/* OUTFIT CARDS (Strictly Unmixed) */}
        <div
          className={`w-full max-w-4xl grid gap-4 md:gap-5 px-4 mb-6 ${
            activeGender === 'WOMEN'
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {currentGarments.map((garment) => {
            const isSelected = activeCategory === garment.id;
            return (
              <div
                key={garment.id}
                onClick={() => handleCategorySelect(garment.id)}
                onDoubleClick={handleStartVirtualTryOn}
                className={`relative rounded-2xl md:rounded-3xl p-5 md:p-6 border transition-all duration-300 flex flex-col justify-between cursor-pointer group select-none ${
                  isSelected
                    ? 'border-2 border-[#B48425] bg-gradient-to-b from-white via-[#FFFDF8] to-[#FFF9EE] shadow-[0_8px_30px_rgba(212,175,55,0.25)] ring-2 ring-[#D4AF37]/30 scale-[1.01]'
                    : 'bg-white/95 border border-[#E6D8BA] hover:border-[#C59B37] shadow-[0_4px_18px_rgba(212,175,55,0.06)] hover:shadow-md'
                }`}
              >
                {/* Upper row: Title/Description + Right Arrow */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <h3 className="font-serif text-2xl md:text-3xl font-black text-[#111827] group-hover:text-[#9A7938] transition-colors leading-tight">
                      {garment.name}
                    </h3>
                    <p className="text-xs md:text-sm font-bold tracking-widest text-[#B48425] uppercase mt-1">
                      {garment.subtitle}
                    </p>

                    <div className="w-full h-[1px] bg-[#E6D8BA] my-3" />

                    <p className="text-xs md:text-sm text-[#4B5563] leading-relaxed font-normal">
                      {garment.description}
                    </p>
                  </div>

                  {/* Vertical divider & Arrow */}
                  <div className="flex items-center space-x-3 self-center pl-2">
                    <div className="h-16 w-[1px] bg-[#E6D8BA]" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(garment.id);
                        handleStartVirtualTryOn();
                      }}
                      title={`Try on ${garment.name}`}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#B48425] group-hover:translate-x-1 transition-transform"
                    >
                      <ArrowRight className="w-6 h-6 stroke-[2]" />
                    </button>
                  </div>
                </div>

                {/* Bottom row: Selection State & Check Radio */}
                <div className="mt-5 pt-3 border-t border-[#E6D8BA] flex items-center justify-between">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      isSelected ? 'text-[#111827]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {isSelected ? 'SELECTED' : 'TAP TO SELECT'}
                  </span>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#B48425] text-white shadow-md'
                        : 'border-2 border-[#D1D5DB] group-hover:border-[#B48425]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM STICKY ACTION BAR */}
        <footer className="w-full max-w-4xl mx-auto bg-white/95 border border-[#E6D8BA] rounded-2xl md:rounded-3xl p-3.5 md:p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(212,175,55,0.15)] px-5">
          {/* Current Selection indicator */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-[#FDF8EE] to-[#F5E8CB] border border-[#E0D0A8] flex items-center justify-center shadow-inner">
              <Shirt className="w-6 h-6 text-[#B48425]" />
            </div>

            <div className="h-8 w-[1px] bg-[#E6D8BA]" />

            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#71717A] uppercase block">
                CURRENT SELECTION
              </span>
              <span className="font-serif text-lg md:text-2xl font-black text-[#111827]">
                {activeGender} &bull; {activeCategory || 'Pick an Outfit Above'}
              </span>
            </div>
          </div>

          {/* Primary CTA Button */}
          <button
            disabled={!activeCategory}
            onClick={handleStartVirtualTryOn}
            className="group relative z-30 flex items-center justify-center space-x-3 py-3.5 md:py-4 px-8 md:px-12 rounded-full text-sm md:text-base font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] border-2 border-[#FFF0C7] shadow-[0_10px_30px_rgba(212,175,55,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-7 h-7 rounded-full bg-[#111827] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
            </div>
            <div className="h-5 w-[1.5px] bg-[#111827]/20 mx-1" />
            <span className="tracking-widest">START VIRTUAL TRY-ON</span>
            <ArrowRight className="w-5 h-5 text-[#111827] stroke-[2.5] group-hover:translate-x-1.5 transition-transform" />
          </button>
        </footer>
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

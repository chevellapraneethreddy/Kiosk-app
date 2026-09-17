import React, { useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Button } from '../components/Button';
import { FashionGender, FashionCategory } from '../types';
import { Sparkles, Check, ArrowLeft, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface GarmentOption {
  id: FashionCategory;
  name: string;
  subtitle: string;
  badge: string;
  iconUrl: string;
  description: string;
  gradient: string;
}

const MEN_GARMENTS: GarmentOption[] = [
  {
    id: 'Shirt',
    name: 'Shirt',
    subtitle: 'Button-Up & Collared',
    badge: 'Upper Body',
    iconUrl: '/icons/shirt.png',
    description: 'Crisp collar, buttons, full sleeves down to cuffs, tailored torso fit.',
    gradient: 'from-blue-600/25 via-indigo-600/15 to-transparent',
  },
  {
    id: 'T-Shirt',
    name: 'T-Shirt',
    subtitle: 'Crewneck & Casual Tee',
    badge: 'Upper Body',
    iconUrl: '/icons/tshirt.png',
    description: 'Comfortable crewneck, relaxed fit, uniform reference fabric drape.',
    gradient: 'from-emerald-600/25 via-teal-600/15 to-transparent',
  },
  {
    id: 'Pant',
    name: 'Pant',
    subtitle: 'Trousers, Chinos & Jeans',
    badge: 'Lower Body',
    iconUrl: '/icons/pant.png',
    description: 'Tailored waistline, fly, pockets, and straight leg drape down to shoes.',
    gradient: 'from-sky-600/25 via-blue-600/15 to-transparent',
  },
  {
    id: 'Kurtha',
    name: 'Kurtha',
    subtitle: "Traditional Men's Kurta",
    badge: 'Ethnic Wear',
    iconUrl: '/icons/kurtha.png',
    description: 'Classic long tunic, mandarin collar, festive ethnic wear past knees.',
    gradient: 'from-amber-600/25 via-yellow-600/15 to-transparent',
  },
];

const WOMEN_GARMENTS: GarmentOption[] = [
  {
    id: 'Saree',
    name: 'Saree',
    subtitle: 'Silk, Banarasi & Designer',
    badge: 'Traditional Saree Drape',
    iconUrl: '/icons/saree.png',
    description: 'Authentic diagonal pallu, matching blouse, waist pleats & floor-length drape.',
    gradient: 'from-rose-600/30 via-pink-600/15 to-transparent',
  },
  {
    id: 'Dress',
    name: 'Dress',
    subtitle: 'Gown, Frock & Kurti',
    badge: 'Full-Length Outfit',
    iconUrl: '/icons/dress.png',
    description: 'Graceful feminine silhouette, tailored bustline and flowy elegant hem.',
    gradient: 'from-purple-600/30 via-fuchsia-600/15 to-transparent',
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
    selectedGender === activeGender ? selectedCategory : null
  );

  const handleGenderSwitch = (gender: FashionGender) => {
    setActiveGender(gender);
    setSelectedGender(gender);
    // Strict separation: never mix categories across genders
    setActiveCategory(null);
    setSelectedCategory(null);
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-[#080B12] via-[#0D1424] to-[#0A0D16] text-white select-none overflow-x-hidden p-6 md:p-10">
      {/* Background Ambient Glows */}
      <div className="absolute top-10 -left-32 w-96 h-96 bg-[#D4AF37]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-32 w-96 h-96 bg-[#16203A]/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Back Button and Brand */}
      <header className="relative z-30 w-full max-w-7xl mx-auto flex items-center justify-between pb-4 border-b border-gold-500/20">
        <button
          onClick={() => setStep('WELCOME')}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-full glass-panel text-gold-300 hover:text-white border border-gold-500/30 font-bold uppercase tracking-wider text-xs md:text-sm transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-gold-400" />
          <span>BACK</span>
        </button>

        <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full glass-panel border border-gold-500/30 text-gold-300 text-xs tracking-widest uppercase font-semibold">
          <Sparkles className="w-4 h-4 text-gold-400 animate-spin-slow" />
          <span>Fashion Category Selection</span>
        </div>
      </header>

      {/* Main Content Area - Optimized for 1920x1080 Kiosk Display */}
      <main className="relative z-20 flex-1 max-w-7xl mx-auto w-full py-8 flex flex-col items-center justify-center">
        {/* Large "CHOOSE YOUR CATEGORY" Heading */}
        <div className="text-center mb-8 space-y-2 max-w-3xl">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-black gold-gradient-text uppercase tracking-wider leading-tight">
            CHOOSE YOUR CATEGORY
          </h1>
          <p className="text-sm md:text-lg text-gray-300 font-medium">
            Select your gender and outfit to begin your AI virtual try-on experience
          </p>
        </div>

        {/* Separate MEN and WOMEN Category Selectors */}
        <div className="w-full max-w-3xl grid grid-cols-2 gap-6 mb-10">
          {/* WOMEN SELECTOR */}
          <button
            onClick={() => handleGenderSwitch('WOMEN')}
            className={`relative p-6 md:p-8 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center border-2 text-center group cursor-pointer ${
              activeGender === 'WOMEN'
                ? 'bg-gradient-to-b from-[#1C1217] via-[#140D13] to-[#0D0B10] border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] scale-[1.03]'
                : 'glass-panel border-white/10 hover:border-gold-500/40 opacity-70 hover:opacity-100 hover:scale-[1.01]'
            }`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-rose-500/15 border border-rose-400/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-3xl md:text-4xl">👩</span>
            </div>
            <span className="font-serif text-2xl md:text-3xl font-black tracking-wider uppercase text-white">
              WOMEN
            </span>
            <span className="text-xs md:text-sm font-semibold text-rose-300 mt-1 uppercase tracking-widest">
              Saree &bull; Dress
            </span>
            {activeGender === 'WOMEN' && (
              <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </span>
            )}
          </button>

          {/* MEN SELECTOR */}
          <button
            onClick={() => handleGenderSwitch('MEN')}
            className={`relative p-6 md:p-8 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center border-2 text-center group cursor-pointer ${
              activeGender === 'MEN'
                ? 'bg-gradient-to-b from-[#0D1627] via-[#0A1020] to-[#070A12] border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.03]'
                : 'glass-panel border-white/10 hover:border-gold-500/40 opacity-70 hover:opacity-100 hover:scale-[1.01]'
            }`}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-blue-500/15 border border-blue-400/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span className="text-3xl md:text-4xl">👨</span>
            </div>
            <span className="font-serif text-2xl md:text-3xl font-black tracking-wider uppercase text-white">
              MEN
            </span>
            <span className="text-xs md:text-sm font-semibold text-blue-300 mt-1 uppercase tracking-widest">
              Shirt &bull; T-Shirt &bull; Pant &bull; Kurtha
            </span>
            {activeGender === 'MEN' && (
              <span className="absolute top-4 right-4 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white stroke-[3]" />
              </span>
            )}
          </button>
        </div>

        {/* Outfit Selection Grid (Strictly Unmixed) */}
        <div className="w-full max-w-5xl mb-8">
          <div className="flex items-center justify-between mb-4 px-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-gold-400" />
              <span className="text-xs md:text-sm font-bold uppercase tracking-widest text-gold-300">
                AVAILABLE {activeGender} OUTFITS ({currentGarments.length})
              </span>
            </div>
            <span className="text-xs text-gray-400 font-medium tracking-wide">
              Categories are strictly isolated &bull; Never mixed
            </span>
          </div>

          <div
            className={`grid gap-6 ${
              activeGender === 'WOMEN'
                ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'
                : 'grid-cols-2 md:grid-cols-4'
            }`}
          >
            {currentGarments.map((garment) => {
              const isSelected = activeCategory === garment.id;
              return (
                <div
                  key={garment.id}
                  onClick={() => handleCategorySelect(garment.id)}
                  className={`relative cursor-pointer rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 flex flex-col justify-between group active:scale-95 ${
                    isSelected
                      ? `bg-gradient-to-b ${garment.gradient} border-gold-400 shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-[1.03]`
                      : 'glass-panel border-white/10 hover:border-gold-500/50 hover:bg-white/5 hover:scale-[1.01]'
                  }`}
                >
                  {/* Top Row: Icon + Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-black/60 border border-gold-400/20 p-2 flex items-center justify-center group-hover:scale-105 group-hover:border-gold-400/50 transition-all duration-300 shadow-xl shadow-black/50 overflow-hidden">
                      <img
                        src={garment.iconUrl}
                        alt={garment.name}
                        className="w-full h-full object-contain rounded-xl drop-shadow-md"
                        loading="eager"
                      />
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                        isSelected
                          ? 'bg-gold-500 text-black border-gold-400 font-black shadow-md'
                          : 'bg-white/5 text-gray-300 border-white/10'
                      }`}
                    >
                      {garment.badge}
                    </span>
                  </div>

                  {/* Center Info */}
                  <div className="space-y-1.5 my-2">
                    <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white group-hover:text-gold-300 transition-colors">
                      {garment.name}
                    </h3>
                    <p className="text-xs md:text-sm font-semibold text-gold-400/90 tracking-wide uppercase">
                      {garment.subtitle}
                    </p>
                    <p className="text-xs text-gray-300/90 font-normal leading-relaxed pt-1">
                      {garment.description}
                    </p>
                  </div>

                  {/* Bottom Select Status */}
                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isSelected ? 'text-gold-300' : 'text-gray-400 group-hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Tap to Select'}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/50'
                          : 'border border-gray-500 group-hover:border-gold-400'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Bar with "START VIRTUAL TRY-ON" CTA */}
      <footer className="relative z-30 w-full max-w-4xl mx-auto glass-panel p-4 md:p-5 rounded-3xl border border-gold-500/40 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-3 pl-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 border border-gold-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
              Current Selection
            </span>
            <span className="font-serif text-lg md:text-xl font-bold text-white">
              {activeGender} &bull; {activeCategory || 'Pick an Outfit Above'}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="xl"
          disabled={!activeCategory}
          onClick={handleStartVirtualTryOn}
          className="py-4 md:py-5 px-8 md:px-12 font-black tracking-wider uppercase shadow-[0_0_30px_rgba(212,175,55,0.4)] text-base md:text-lg cursor-pointer"
        >
          <span>START VIRTUAL TRY-ON</span>
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </footer>
    </div>
  );
};

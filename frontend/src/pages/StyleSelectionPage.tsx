import React, { useEffect, useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Header } from '../components/Header';
import { StyleCard } from '../components/StyleCard';
import { Button } from '../components/Button';
import { Style } from '../types';
import { api } from '../services/api';
import { Wand2 } from 'lucide-react';

export const StyleSelectionPage: React.FC = () => {
  const { setStep, selectedExperience, selectedStyle, setSelectedStyle, originalPhotoUrl, sessionData, setCurrentGeneration } = useKiosk();
  const [styles, setStyles] = useState<Style[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStyles();
  }, [selectedExperience]);

  const loadStyles = async () => {
    try {
      setLoading(true);
      const data = await api.getStyles(selectedExperience?.id);
      setStyles(data);

      const uniqueCats = Array.from(new Set(data.map((s) => s.category)));
      setCategories(uniqueCats);
    } catch (err) {
      console.error('Failed to load styles:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStyles = activeCategory === 'ALL'
    ? styles
    : styles.filter((s) => s.category === activeCategory);

  const handleGenerate = async () => {
    if (!selectedStyle || !selectedExperience || !originalPhotoUrl) {
      alert('Please select a style before generating!');
      return;
    }

    try {
      setStep('GENERATING');

      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        experienceId: selectedExperience.id,
        styleId: selectedStyle.id,
        originalImagePath: originalPhotoUrl,
      });

      setCurrentGeneration(gen);
    } catch (err: any) {
      alert(`Failed to start generation: ${err.message}`);
      setStep('STYLE_SELECT');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E]">
      <Header title="Step 4: Select Your Style & Outfit" onBack={() => setStep('PHOTO_PREVIEW')} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-8 flex flex-col">
        {/* Category Selector Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center justify-center space-x-3 mb-8 overflow-x-auto no-scrollbar py-2">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                activeCategory === 'ALL'
                  ? 'gold-button text-black shadow-lg scale-105'
                  : 'glass-panel text-gray-300 hover:text-white border border-gold-500/20'
              }`}
            >
              All Styles
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'gold-button text-black shadow-lg scale-105'
                    : 'glass-panel text-gray-300 hover:text-white border border-gold-500/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Styles Grid */}
        {loading ? (
          <div className="text-center text-gold-400 font-serif text-2xl animate-pulse py-16">
            Loading Style Collection...
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 flex-1 items-stretch">
            {filteredStyles.map((style) => (
              <StyleCard
                key={style.id}
                style={style}
                isSelected={selectedStyle?.id === style.id}
                onSelect={(s) => setSelectedStyle(s)}
              />
            ))}
          </div>
        )}

        {/* Sticky Generate Button Bar */}
        <div className="mt-8 pt-6 border-t border-gold-500/20 flex items-center justify-between glass-panel px-8 py-5 rounded-3xl sticky bottom-4 z-20 shadow-2xl">
          <div className="flex items-center space-x-4">
            {selectedStyle ? (
              <div>
                <span className="text-xs text-gold-400/70 uppercase tracking-widest block">Selected Style:</span>
                <span className="font-serif text-2xl font-bold text-white">{selectedStyle.name}</span>
              </div>
            ) : (
              <span className="text-lg text-gray-300 font-medium">Please pick a style above to proceed</span>
            )}
          </div>

          <Button
            variant="primary"
            size="xl"
            disabled={!selectedStyle}
            onClick={handleGenerate}
            className="shadow-2xl"
          >
            <Wand2 className="w-8 h-8 mr-3" />
            <span>GENERATE MY LOOK</span>
          </Button>
        </div>
      </main>
    </div>
  );
};

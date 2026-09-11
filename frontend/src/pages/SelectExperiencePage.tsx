import React, { useEffect, useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Experience } from '../types';
import { api } from '../services/api';
import { Sparkles, Shirt, UserCheck, Palette, ChevronRight } from 'lucide-react';

export const SelectExperiencePage: React.FC = () => {
  const { setStep, setSelectedExperience, selectedExperience } = useKiosk();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadExperiences();
  }, []);

  const loadExperiences = async () => {
    try {
      setLoading(true);
      const data = await api.getExperiences();
      setExperiences(data);
    } catch (err) {
      console.error('Failed to load experiences:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (slug: string) => {
    switch (slug) {
      case 'ai-saree-tryon':
        return <Sparkles className="w-12 h-12 text-pink-400" />;
      case 'ai-outfit-change':
        return <Shirt className="w-12 h-12 text-gold-400" />;
      case 'ai-portrait':
        return <UserCheck className="w-12 h-12 text-purple-400" />;
      default:
        return <Palette className="w-12 h-12 text-blue-400" />;
    }
  };

  const handleSelect = (exp: Experience) => {
    setSelectedExperience(exp);
    setStep('PHOTO_INPUT');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E]">
      <Header title="Step 1: Choose Your Experience" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-8 py-12 flex flex-col justify-center">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-extrabold gold-gradient-text uppercase tracking-wider mb-4">
            Select Your AI Experience
          </h2>
          <p className="text-xl text-gray-300">
            Choose what you would like to create today
          </p>
        </div>

        {loading ? (
          <div className="text-center text-gold-400 py-12 font-serif text-2xl animate-pulse">
            Loading Catalog...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {experiences.map((exp) => (
              <Card
                key={exp.id}
                selected={selectedExperience?.id === exp.id}
                onClick={() => handleSelect(exp)}
                className="group flex flex-col items-center text-center justify-between min-h-[360px] p-8"
              >
                <div className="w-24 h-24 rounded-full bg-royal-800/80 border-2 border-gold-500/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-gold-400 transition-all shadow-xl">
                  {getIcon(exp.slug)}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="font-serif text-2xl font-bold text-white mb-3 group-hover:text-gold-400 transition-colors">
                    {exp.name}
                  </h3>
                  <p className="text-gray-300 text-base leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                <div className="mt-8 flex items-center space-x-2 text-gold-400 font-bold uppercase tracking-wider text-sm group-hover:translate-x-2 transition-transform">
                  <span>Select Experience</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

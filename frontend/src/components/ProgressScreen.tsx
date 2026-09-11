import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { PROGRESS_MESSAGES } from '../../../shared/src/constants';

interface ProgressScreenProps {
  progress?: number;
  statusText?: string;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ progress = 0, statusText }) => {
  const [msgIndex, setMsgIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const currentMessage = statusText || PROGRESS_MESSAGES[msgIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0D17] flex flex-col items-center justify-center p-8 text-center">
      {/* Background ambient lighting */}
      <div className="absolute w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />

      {/* Center Spinner Ring */}
      <div className="relative w-48 h-48 mb-12 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-gold-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-gold-400 border-t-transparent animate-spin" />
        <div className="absolute inset-4 rounded-full border-2 border-purple-500/30 border-b-transparent animate-spin-slow" />
        <div className="w-24 h-24 rounded-full bg-gold-500/10 backdrop-blur-md border border-gold-500/40 flex items-center justify-center shadow-2xl">
          <Wand2 className="w-12 h-12 text-gold-400 animate-bounce" />
        </div>
      </div>

      {/* Animated Title & Message */}
      <h2 className="font-serif text-4xl font-extrabold gold-gradient-text tracking-wider mb-4">
        Creating Your AI Look...
      </h2>

      <p className="text-2xl text-gray-200 font-medium tracking-wide h-12 transition-all duration-500">
        {currentMessage}
      </p>

      {/* Progress Bar (If provided) */}
      {progress > 0 && (
        <div className="w-full max-w-md mt-8 bg-royal-800 rounded-full h-3 p-1 border border-gold-500/30 overflow-hidden">
          <div
            className="gold-button h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="mt-12 flex items-center space-x-2 text-xs text-gold-400/60 uppercase tracking-widest">
        <Sparkles className="w-4 h-4" />
        <span>Synthesizing high-resolution outfit metadata</span>
        <Sparkles className="w-4 h-4" />
      </div>
    </div>
  );
};

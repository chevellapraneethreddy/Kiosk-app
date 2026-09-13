import React, { useState, useEffect } from 'react';
import { Sparkles, Shirt, Wand2, CheckCircle2, Loader2 } from 'lucide-react';

interface ProgressScreenProps {
  progress?: number;
  statusText?: string;
  stage?: 'analyzing' | 'preparing' | 'creating' | 'finalizing';
}

const STAGES = [
  { key: 'analyzing', label: 'Analyzing your garment', icon: Shirt },
  { key: 'preparing', label: 'Preparing your virtual try-on', icon: Wand2 },
  { key: 'creating', label: 'Creating your final look', icon: Sparkles },
];

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ progress = 0, statusText, stage }) => {
  // Determine current active stage index
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);

  useEffect(() => {
    if (stage) {
      if (stage === 'analyzing') setActiveStageIndex(0);
      else if (stage === 'preparing') setActiveStageIndex(1);
      else setActiveStageIndex(2);
      return;
    }

    // Map backend progress (15, 35, 50, 85, 100) to stages
    if (progress >= 80) {
      setActiveStageIndex(2);
    } else if (progress >= 35) {
      setActiveStageIndex(1);
    } else {
      setActiveStageIndex(0);
    }
  }, [progress, stage]);

  return (
    <div className="fixed inset-0 z-50 bg-[#07080E] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-amber-500/15 to-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Badge */}
      <div className="relative z-10 flex items-center space-x-2 bg-[#12131C]/80 backdrop-blur-md px-5 py-2 rounded-full border border-gold-500/30 shadow-xl">
        <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
        <span className="font-sans text-xs sm:text-sm font-bold tracking-widest text-amber-300 uppercase">
          AI DIGITAL FASHION MIRROR
        </span>
        <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
      </div>

      {/* Center Main Stage Content */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center my-auto">
        {/* Animated Mirror Shimmer Portal */}
        <div className="relative w-40 h-52 sm:w-48 sm:h-64 rounded-3xl border-2 border-gold-500/40 bg-gradient-to-b from-[#161726]/90 to-[#0A0B12]/90 backdrop-blur-xl shadow-2xl p-4 flex flex-col items-center justify-center mb-8 overflow-hidden">
          {/* Shimmer sweep animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />

          {/* Central Animated Icon based on active step */}
          <div className="relative w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shadow-lg mb-3">
            {activeStageIndex === 0 && <Shirt className="w-10 h-10 text-amber-400 animate-pulse" />}
            {activeStageIndex === 1 && <Wand2 className="w-10 h-10 text-amber-400 animate-bounce" />}
            {activeStageIndex >= 2 && <Sparkles className="w-10 h-10 text-amber-400 animate-spin-slow" />}
          </div>

          <div className="text-[11px] font-bold uppercase tracking-widest text-gold-300/80">
            {STAGES[activeStageIndex]?.label || 'Processing'}
          </div>

          {/* Glowing pulse ring */}
          <div className="absolute -inset-1 rounded-3xl border border-amber-500/20 blur-sm pointer-events-none" />
        </div>

        {/* Main Title */}
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-wider text-white mb-2 uppercase">
          CREATING YOUR LOOK<span className="text-amber-400 animate-pulse">...</span>
        </h2>

        <p className="text-sm sm:text-base text-gray-300 font-light mb-8 max-w-sm">
          {statusText || 'Crafting your personalized virtual outfit with realistic drapery and fit.'}
        </p>

        {/* 3 Step Milestone Indicators */}
        <div className="w-full bg-[#121422]/70 backdrop-blur-md rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3.5 shadow-xl text-left">
          {STAGES.map((st, idx) => {
            const isDone = activeStageIndex > idx;
            const isCurrent = activeStageIndex === idx;
            const StepIcon = st.icon;

            return (
              <div
                key={st.key}
                className={`flex items-center space-x-3.5 transition-all duration-300 ${
                  isCurrent
                    ? 'text-amber-300 font-semibold'
                    : isDone
                    ? 'text-emerald-400 font-medium'
                    : 'text-gray-500 font-normal'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                      : isCurrent
                      ? 'bg-amber-500/20 border border-amber-400/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border border-white/10 text-gray-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 text-xs sm:text-sm tracking-wide">
                  {st.label}
                </div>

                {isCurrent && (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    IN PROGRESS
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                    DONE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer "Please wait..." message */}
      <div className="relative z-10 text-center py-2">
        <div className="inline-flex items-center space-x-2 text-xs sm:text-sm font-serif italic text-amber-200/80 tracking-widest">
          <span>Please wait...</span>
        </div>
      </div>
    </div>
  );
};


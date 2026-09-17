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
    <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between p-8 text-center bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E] overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="mt-8 flex items-center space-x-2 px-6 py-2 rounded-full glass-panel border border-gold-500/30 text-gold-300 text-sm tracking-widest uppercase font-semibold">
        <Sparkles className="w-5 h-5 text-gold-400 animate-spin-slow" />
        <span>Men & Women AI Virtual Try-On Standee</span>
      </div>

      {/* Center Welcome Hero Title */}
      <div className="my-auto flex flex-col items-center max-w-4xl">
        <div className="w-24 h-24 mb-6 rounded-full bg-gold-500/10 border-2 border-gold-400/60 flex items-center justify-center shadow-2xl shadow-gold-500/20">
          <Sparkles className="w-12 h-12 text-gold-400" />
        </div>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black tracking-wider gold-gradient-text uppercase mb-4 leading-tight">
          REAL VIRTUAL TRY-ON
        </h1>

        <p className="text-xl md:text-2xl font-medium text-gray-200 tracking-wide mb-12 max-w-2xl">
          Hold your saree, dress, shirt, t-shirt, kurtha or pants in front of the camera and see yourself wearing it in real-time AI output!
        </p>

        {/* Large Touchscreen CTA */}
        <Button variant="primary" size="xl" onClick={handleStart} className="shadow-2xl shadow-gold-500/30 scale-105 hover:scale-110 py-6 px-12 text-xl font-bold">
          <Play className="w-8 h-8 mr-4 fill-black" />
          <span>START VIRTUAL TRY-ON</span>
        </Button>
      </div>

      {/* Secondary Controls & Instructions */}
      <div className="mb-8 flex items-center space-x-6">
        <button
          onClick={() => setIsHowItWorksOpen(true)}
          className="flex items-center space-x-2 px-6 py-3 rounded-2xl glass-panel text-gold-300 hover:text-white border border-gold-500/30 text-base font-semibold transition-all active:scale-95"
        >
          <HelpCircle className="w-5 h-5 text-gold-400" />
          <span>How It Works</span>
        </button>

        <button
          onClick={() => alert('Language selection: English default')}
          className="flex items-center space-x-2 px-6 py-3 rounded-2xl glass-panel text-gold-300 hover:text-white border border-gold-500/30 text-base font-semibold transition-all active:scale-95"
        >
          <Globe className="w-5 h-5 text-gold-400" />
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
            <strong className="text-gold-400">Hold Your Garment:</strong> Hold your saree or dress clearly in front of the camera.
          </li>
          <li>
            <strong className="text-gold-400">Capture Photo:</strong> Click "CAPTURE PHOTO" to capture yourself holding your garment.
          </li>
          <li>
            <strong className="text-gold-400">AI Garment Extraction & Try-On:</strong> Our AI automatically extracts your held garment and fits it seamlessly onto your portrait.
          </li>
          <li>
            <strong className="text-gold-400">Scan & Phone Download:</strong> Scan the real QR code with your smartphone to open, view, and save your photo!
          </li>
        </ol>
      </Modal>
    </div>
  );
};

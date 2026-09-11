import React, { useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { RefreshCw, Check, RotateCw } from 'lucide-react';

export const PhotoPreviewPage: React.FC = () => {
  const { setStep, originalPhotoUrl, setOriginalPhotoUrl } = useKiosk();
  const [rotation, setRotation] = useState<number>(0);
  const [imgError, setImgError] = useState<boolean>(false);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRetake = () => {
    setOriginalPhotoUrl(null);
    setStep('PHOTO_INPUT');
  };

  const handleContinue = () => {
    setStep('STYLE_SELECT');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E]">
      <Header title="Step 3: Confirm & Position Photo" onBack={() => setStep('PHOTO_INPUT')} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-8 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden glass-panel border-4 border-gold-500/50 shadow-2xl flex items-center justify-center bg-black">
          {originalPhotoUrl && !imgError ? (
            <img
              src={originalPhotoUrl}
              alt="Photo preview"
              className="w-full h-full object-cover transition-transform duration-300"
              style={{ transform: `rotate(${rotation}deg)` }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="text-center p-6 text-red-300">
              <p className="text-lg font-bold mb-2">Photo loading failed</p>
              <p className="text-xs text-gray-400 mb-4">Please retake or re-upload your photo.</p>
              <Button variant="secondary" size="md" onClick={handleRetake}>
                Retake Photo
              </Button>
            </div>
          )}

          {/* Positioning guideline frame */}
          {originalPhotoUrl && !imgError && (
            <div className="absolute inset-0 pointer-events-none border-2 border-gold-400/30 rounded-3xl flex flex-col items-center justify-center p-6">
              <div className="w-56 h-72 border border-dashed border-gold-400/60 rounded-full opacity-60" />
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 w-full max-w-md">
          <Button variant="secondary" size="lg" onClick={handleRotate}>
            <RotateCw className="w-6 h-6 mr-2" />
            <span>Rotate</span>
          </Button>

          <Button variant="secondary" size="lg" onClick={handleRetake}>
            <RefreshCw className="w-6 h-6 mr-2" />
            <span>Retake</span>
          </Button>

          <Button variant="primary" size="lg" onClick={handleContinue} disabled={imgError || !originalPhotoUrl}>
            <Check className="w-6 h-6 mr-2" />
            <span>Confirm</span>
          </Button>
        </div>
      </main>
    </div>
  );
};

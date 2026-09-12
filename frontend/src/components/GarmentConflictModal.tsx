import React from 'react';
import { FashionGender, FashionCategory } from '../types';
import { AlertTriangle, RefreshCw, Layers, CheckCircle2, X } from 'lucide-react';
import { Button } from './Button';

interface GarmentConflictModalProps {
  isOpen: boolean;
  selectedGender: FashionGender | null;
  selectedCategory: FashionCategory | null;
  detectedGender: string;
  detectedCategory: string;
  detectedDescription?: string;
  message?: string;
  onSwitchToDetected?: (gender: FashionGender, category: FashionCategory) => void;
  onChangeCategory: () => void;
  onRetake: () => void;
  onClose: () => void;
}

export const GarmentConflictModal: React.FC<GarmentConflictModalProps> = ({
  isOpen,
  selectedGender,
  selectedCategory,
  detectedGender,
  detectedCategory,
  detectedDescription,
  message,
  onSwitchToDetected,
  onChangeCategory,
  onRetake,
  onClose,
}) => {
  if (!isOpen) return null;

  // Determine if the detected category can be mapped to a valid FashionCategory
  const normDetectedCat = detectedCategory.toLowerCase();
  let mappedCategory: FashionCategory | null = null;
  let mappedGender: FashionGender = 'MEN';

  if (normDetectedCat.includes('saree') || normDetectedCat.includes('sari')) {
    mappedCategory = 'Saree';
    mappedGender = 'WOMEN';
  } else if (normDetectedCat.includes('dress') || normDetectedCat.includes('gown') || normDetectedCat.includes('kurti')) {
    mappedCategory = 'Dress';
    mappedGender = 'WOMEN';
  } else if (normDetectedCat.includes('kurtha') || normDetectedCat.includes('kurta')) {
    mappedCategory = 'Kurtha';
    mappedGender = 'MEN';
  } else if (normDetectedCat.includes('t-shirt') || normDetectedCat.includes('tshirt') || normDetectedCat.includes('tee')) {
    mappedCategory = 'T-Shirt';
    mappedGender = 'MEN';
  } else if (normDetectedCat.includes('pant') || normDetectedCat.includes('trouser') || normDetectedCat.includes('jean')) {
    mappedCategory = 'Pant';
    mappedGender = 'MEN';
  } else if (normDetectedCat.includes('shirt')) {
    mappedCategory = 'Shirt';
    mappedGender = 'MEN';
  }

  const canQuickSwitch = mappedCategory !== null && onSwitchToDetected !== undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel border-2 border-amber-500/60 rounded-3xl p-6 md:p-8 shadow-2xl text-white flex flex-col items-center text-center space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full glass-panel text-gray-400 hover:text-white border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <AlertTriangle className="w-9 h-9 text-amber-400 animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
            Garment Mismatch Detected
          </span>
          <h2 className="font-serif text-2xl md:text-3xl font-black text-white">
            Category Conflict
          </h2>
          <p className="text-xs md:text-sm text-gray-300">
            {message ||
              'The garment detected in front of the camera conflicts with your selected category.'}
          </p>
        </div>

        {/* Comparison Box */}
        <div className="w-full grid grid-cols-2 gap-3">
          {/* Selected */}
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-left">
            <span className="text-[10px] uppercase font-bold text-red-300 block tracking-wider">
              Selected Category
            </span>
            <span className="font-serif text-lg font-bold text-white block mt-0.5">
              {selectedGender} &bull; {selectedCategory}
            </span>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Expecting a {selectedCategory?.toLowerCase()}
            </span>
          </div>

          {/* Detected */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-left">
            <span className="text-[10px] uppercase font-bold text-amber-300 block tracking-wider">
              Detected by Scanner
            </span>
            <span className="font-serif text-lg font-bold text-amber-200 block mt-0.5 capitalize">
              {detectedGender ? `${detectedGender} • ` : ''}{detectedCategory}
            </span>
            <span className="text-[11px] text-gray-300 mt-1 block truncate">
              {detectedDescription || 'Held physical garment'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-300 italic">
          To protect output quality and prevent generating the wrong outfit, please choose an action below:
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3 pt-2">
          {canQuickSwitch && mappedCategory && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => onSwitchToDetected(mappedGender, mappedCategory!)}
              className="w-full py-4 text-sm font-extrabold uppercase shadow-lg shadow-gold-500/30"
            >
              <CheckCircle2 className="w-5 h-5 mr-2 text-black" />
              <span>
                Switch to {mappedGender} &bull; {mappedCategory}
              </span>
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onChangeCategory}
              className="py-3 text-xs md:text-sm font-bold uppercase"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              <span>Change Category</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={onRetake}
              className="py-3 text-xs md:text-sm font-bold uppercase"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              <span>Retake Photo</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

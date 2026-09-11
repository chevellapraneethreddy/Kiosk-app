import React from 'react';
import { useKiosk } from '../context/KioskContext';
import { ResultViewer } from '../components/ResultViewer';

export const ResultScreenPage: React.FC = () => {
  const { resultData, currentGeneration, startNewExperience } = useKiosk();

  const generatedImageUrl =
    resultData?.generation?.generatedImagePath || currentGeneration?.generatedImagePath || '';
  const qrDataUrl = resultData?.qrDataUrl || '';

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none z-50">
      {generatedImageUrl && qrDataUrl ? (
        <ResultViewer
          generatedImageUrl={generatedImageUrl}
          qrDataUrl={qrDataUrl}
          onStartOver={startNewExperience}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0D17] text-gold-400 font-serif text-3xl font-bold animate-pulse">
          Rendering your high-resolution AI fashion look...
        </div>
      )}
    </div>
  );
};

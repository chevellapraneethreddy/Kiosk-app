import React, { useEffect, useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { ProgressScreen } from '../components/ProgressScreen';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { AlertCircle, RefreshCw, ArrowLeft, RotateCcw } from 'lucide-react';

export const GenerationScreenPage: React.FC = () => {
  const { currentGeneration, setCurrentGeneration, setResultData, setStep, startNewExperience } = useKiosk();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentGeneration?.id) return;

    let isMounted = true;
    let pollTimer: any = null;

    const checkStatus = async () => {
      try {
        const gen = await api.getGenerationStatus(currentGeneration.id);
        if (!isMounted) return;

        setCurrentGeneration(gen);

        if (gen.status === 'COMPLETED') {
          if (gen.publicToken) {
            const res = await api.getResultByToken(gen.publicToken);
            setResultData(res);
            setStep('RESULT');
          }
        } else if (gen.status === 'FAILED') {
          setErrorMsg(gen.errorMessage || 'AI generation encountered an error. Please try again.');
        } else {
          pollTimer = setTimeout(checkStatus, 1000);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to poll generation status.');
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [currentGeneration?.id]);

  if (errorMsg) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0D17] flex flex-col items-center justify-center p-8 text-center">
        <div className="glass-panel p-10 rounded-3xl max-w-xl w-full border-2 border-red-500/40 shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50 mb-6">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>

          <h2 className="font-serif text-3xl font-bold text-white mb-4">Something Went Wrong</h2>
          <p className="text-red-200 text-lg mb-8">{errorMsg}</p>

          <div className="flex flex-col space-y-4 w-full">
            <Button variant="primary" size="lg" onClick={() => setStep('LIVE_STANDEE')}>
              <RefreshCw className="w-6 h-6 mr-2" />
              <span>RETAKE PHOTO & TRY AGAIN</span>
            </Button>

            <Button variant="outline" size="lg" onClick={startNewExperience}>
              <RotateCcw className="w-6 h-6 mr-2" />
              <span>START OVER</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProgressScreen progress={currentGeneration?.progress || 0} />
  );
};

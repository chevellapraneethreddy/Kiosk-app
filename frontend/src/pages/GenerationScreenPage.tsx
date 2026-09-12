import React, { useEffect, useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { ProgressScreen } from '../components/ProgressScreen';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

export const GenerationScreenPage: React.FC = () => {
  const { currentGeneration, setCurrentGeneration, setResultData, setStep, startNewExperience } = useKiosk();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let pollTimer: any = null;
    const startTime = Date.now();
    const TIMEOUT_MS = 90000; // 90 second safety timeout

    // If currentGeneration has not been set within 5 seconds, prompt retry
    const noGenSafetyTimer = setTimeout(() => {
      if (isMounted && !currentGeneration?.id) {
        setErrorMsg('Generation request timed out before starting. Please retake your photo.');
      }
    }, 5000);

    const checkStatus = async () => {
      if (!currentGeneration?.id) return;

      if (Date.now() - startTime > TIMEOUT_MS) {
        if (isMounted) {
          setErrorMsg('Virtual try-on took longer than expected. Please try again.');
        }
        return;
      }

      try {
        const gen = await api.getGenerationStatus(currentGeneration.id);
        if (!isMounted) return;

        setCurrentGeneration(gen);

        if (gen.status === 'COMPLETED') {
          if (gen.publicToken) {
            const res = await api.getResultByToken(gen.publicToken);
            if (isMounted) {
              setResultData(res);
              setStep('RESULT');
            }
          }
        } else if (gen.status === 'FAILED') {
          if (isMounted) {
            setErrorMsg(gen.errorMessage || 'AI generation encountered an error. Please try again.');
          }
        } else {
          // Still processing, poll again in 1.5s
          pollTimer = setTimeout(checkStatus, 1500);
        }
      } catch (err: any) {
        if (isMounted) {
          // Transient network poll error, keep polling instead of failing immediately
          pollTimer = setTimeout(checkStatus, 2500);
        }
      }
    };

    if (currentGeneration?.id) {
      clearTimeout(noGenSafetyTimer);
      checkStatus();
    }

    return () => {
      isMounted = false;
      clearTimeout(noGenSafetyTimer);
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
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setErrorMsg(null);
                setStep('LIVE_STANDEE');
              }}
            >
              <RefreshCw className="w-6 h-6 mr-2" />
              <span>RETAKE PHOTO & TRY AGAIN</span>
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setErrorMsg(null);
                startNewExperience();
              }}
            >
              <RotateCcw className="w-6 h-6 mr-2" />
              <span>START OVER</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ProgressScreen progress={currentGeneration?.progress || 15} />;
};

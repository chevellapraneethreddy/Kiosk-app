import React, { useEffect, useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { ProgressScreen } from '../components/ProgressScreen';
import { Button } from '../components/Button';
import { api } from '../services/api';
import { preloadAndDecodeImage } from '../utils/imageOptimizer';
import { AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';

export const GenerationScreenPage: React.FC = () => {
  const { currentGeneration, setCurrentGeneration, setResultData, setStep, startNewExperience } = useKiosk();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    let pollTimer: any = null;
    const startTime = Date.now();
    const TIMEOUT_MS = 120000; // 120s safety timeout for cold-starts and deep generation

    const intervalTimer = setInterval(() => {
      if (isMounted) {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    const checkStatus = async () => {
      if (!currentGeneration?.id) return;

      if (Date.now() - startTime > TIMEOUT_MS) {
        if (isMounted) {
          setErrorMsg('Virtual try-on took longer than expected. Please tap below to try again.');
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
            // Preload and decode final result in memory so ResultViewer renders instantly
            const imgToPreload = res?.generation?.generatedImagePath || gen.generatedImagePath;
            if (imgToPreload) {
              await preloadAndDecodeImage(imgToPreload);
            }

            if (isMounted) {
              setResultData(res);
              setStep('RESULT');
            }
          }
        } else if (gen.status === 'FAILED') {
          if (isMounted) {
            setErrorMsg(gen.errorMessage || 'AI generation encountered an issue. Please try again.');
          }
        } else {
          // Still processing, poll again in 1.8s (prevents polling spam while staying highly responsive)
          pollTimer = setTimeout(checkStatus, 1800);
        }
      } catch (err: any) {
        if (isMounted) {
          // Transient network poll or server wake-up: keep polling instead of failing
          pollTimer = setTimeout(checkStatus, 2500);
        }
      }
    };

    if (currentGeneration?.id) {
      checkStatus();
    }

    return () => {
      isMounted = false;
      clearInterval(intervalTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [currentGeneration?.id]);

  if (errorMsg) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#080B12] via-[#0C101C] to-[#07090F] flex flex-col items-center justify-center p-8 text-center select-none">
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

  // Map progress & elapsed time to stages and text
  const progress = currentGeneration?.progress || 15;
  let stage: 'analyzing' | 'preparing' | 'creating' = 'analyzing';
  let statusText = 'Analyzing your garment and outfit reference...';

  if (progress >= 80 || elapsedSeconds >= 18) {
    stage = 'creating';
    statusText = 'Creating your final look...';
  } else if (progress >= 35 || elapsedSeconds >= 8) {
    stage = 'preparing';
    statusText = 'Preparing your virtual try-on...';
  }

  return <ProgressScreen progress={progress} stage={stage} statusText={statusText} />;
};


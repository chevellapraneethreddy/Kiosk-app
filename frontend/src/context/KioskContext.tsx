import React, { createContext, useContext, useState, useEffect } from 'react';
import { Experience, Style, Generation, SessionResponse, ResultResponse } from '../types';
import { api } from '../services/api';

export type KioskStep =
  | 'WELCOME'
  | 'LIVE_STANDEE'
  | 'EXPERIENCE'
  | 'PHOTO_INPUT'
  | 'PHOTO_PREVIEW'
  | 'STYLE_SELECT'
  | 'GENERATING'
  | 'RESULT';

interface KioskContextType {
  step: KioskStep;
  setStep: (step: KioskStep) => void;
  sessionData: SessionResponse | null;
  selectedExperience: Experience | null;
  setSelectedExperience: (exp: Experience | null) => void;
  originalPhotoUrl: string | null;
  setOriginalPhotoUrl: (url: string | null) => void;
  selectedStyle: Style | null;
  setSelectedStyle: (style: Style | null) => void;
  currentGeneration: Generation | null;
  setCurrentGeneration: (gen: Generation | null) => void;
  resultData: ResultResponse | null;
  setResultData: (res: ResultResponse | null) => void;
  startNewExperience: () => void;
  initializeSession: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export const KioskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [step, setStep] = useState<KioskStep>('WELCOME');
  const [sessionData, setSessionData] = useState<SessionResponse | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [resultData, setResultData] = useState<ResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startNewExperience = () => {
    setStep('WELCOME');
    setSelectedExperience(null);
    setOriginalPhotoUrl(null);
    setSelectedStyle(null);
    setCurrentGeneration(null);
    setResultData(null);
    setError(null);
  };

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const res = await api.createSession();
      setSessionData(res);
    } catch (err: any) {
      console.error('Failed to initialize kiosk session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Inactivity auto-reset timer (120s welcome, 60s result)
  useEffect(() => {
    if (step === 'WELCOME') return;

    const timeoutSec = step === 'RESULT' ? 60 : 120;
    const timer = setTimeout(() => {
      console.log('Inactivity timeout reached. Resetting kiosk...');
      startNewExperience();
    }, timeoutSec * 1000);

    const resetTimerOnUserActivity = () => {
      clearTimeout(timer);
    };

    window.addEventListener('touchstart', resetTimerOnUserActivity);
    window.addEventListener('mousemove', resetTimerOnUserActivity);
    window.addEventListener('click', resetTimerOnUserActivity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('touchstart', resetTimerOnUserActivity);
      window.removeEventListener('mousemove', resetTimerOnUserActivity);
      window.removeEventListener('click', resetTimerOnUserActivity);
    };
  }, [step]);

  // Subscribe to real-time Server-Sent Events (SSE)
  useEffect(() => {
    if (!sessionData?.session?.id) return;

    const eventSource = new EventSource(`/api/events?sessionId=${sessionData.session.id}`);

    eventSource.addEventListener('mobile_photo_uploaded', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.photoUrl) {
          setOriginalPhotoUrl(data.photoUrl);
        }
      } catch (err) {
        console.error('Error parsing SSE mobile upload event:', err);
      }
    });

    eventSource.addEventListener('generation_complete', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.generationId) {
          api.getGenerationStatus(data.generationId).then(gen => {
            setCurrentGeneration(gen);
            if (gen.publicToken) {
              api.getResultByToken(gen.publicToken).then(resData => {
                setResultData(resData);
                setStep('RESULT');
              });
            }
          });
        }
      } catch (err) {
        console.error('Error parsing SSE generation complete event:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionData]);

  return (
    <KioskContext.Provider
      value={{
        step,
        setStep,
        sessionData,
        selectedExperience,
        setSelectedExperience,
        originalPhotoUrl,
        setOriginalPhotoUrl,
        selectedStyle,
        setSelectedStyle,
        currentGeneration,
        setCurrentGeneration,
        resultData,
        setResultData,
        startNewExperience,
        initializeSession,
        isLoading,
        error,
        setError,
      }}
    >
      {children}
    </KioskContext.Provider>
  );
};

export const useKiosk = () => {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
};

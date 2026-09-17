import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Experience, Style, Generation, SessionResponse, ResultResponse, FashionGender, FashionCategory } from '../types';
import { api, envApiUrl, resolveMediaUrl } from '../services/api';

export type KioskStep =
  | 'WELCOME'
  | 'CATEGORY_SELECT'
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
  selectedGender: FashionGender | null;
  setSelectedGender: (gender: FashionGender | null) => void;
  selectedCategory: FashionCategory | null;
  setSelectedCategory: (cat: FashionCategory | null) => void;
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
  const [selectedGender, setSelectedGender] = useState<FashionGender | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FashionCategory | null>(null);
  const [originalPhotoUrl, setOriginalPhotoUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [resultData, setResultData] = useState<ResultResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<SessionResponse> | null>(null);

  const startNewExperience = () => {
    sessionPromiseRef.current = null;
    setStep('WELCOME');
    setSelectedExperience(null);
    setSelectedGender(null);
    setSelectedCategory(null);
    setOriginalPhotoUrl(null);
    setSelectedStyle(null);
    setCurrentGeneration(null);
    setResultData(null);
    setError(null);
  };

  const initializeSession = async () => {
    if (sessionData) return;
    if (sessionPromiseRef.current) {
      await sessionPromiseRef.current;
      return;
    }
    try {
      setIsLoading(true);
      sessionPromiseRef.current = api.createSession();
      const res = await sessionPromiseRef.current;
      setSessionData(res);
    } catch (err: any) {
      console.error('Failed to initialize kiosk session:', err);
      sessionPromiseRef.current = null;
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

    const sseBase = envApiUrl ? envApiUrl.replace(/\/$/, '') : '';
    const eventSource = new EventSource(`${sseBase}/api/events?sessionId=${sessionData.session.id}`);

    eventSource.addEventListener('mobile_photo_uploaded', (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.photoUrl) {
          setOriginalPhotoUrl(resolveMediaUrl(data.photoUrl));
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

    // Fallback polling every 3 seconds to guarantee photo upload detection
    const pollInterval = setInterval(() => {
      if (sessionData?.session?.sessionToken && !originalPhotoUrl) {
        api.getSession(sessionData.session.sessionToken).then((sess: any) => {
          if (sess?.uploadedPhotoUrl) {
            setOriginalPhotoUrl(resolveMediaUrl(sess.uploadedPhotoUrl));
          }
        }).catch(() => {});
      }
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [sessionData, originalPhotoUrl]);

  return (
    <KioskContext.Provider
      value={{
        step,
        setStep,
        sessionData,
        selectedExperience,
        setSelectedExperience,
        selectedGender,
        setSelectedGender,
        selectedCategory,
        setSelectedCategory,
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

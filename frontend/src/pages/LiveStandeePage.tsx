import React, { useRef, useState, useEffect } from 'react';
import { useKiosk } from '../context/KioskContext';
import { QRCodePanel } from '../components/QRCodePanel';
import { GarmentConflictModal } from '../components/GarmentConflictModal';
import { ProgressScreen } from '../components/ProgressScreen';
import { api } from '../services/api';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { FashionGender, FashionCategory } from '../types';
import {
  Camera,
  Smartphone,
  RotateCcw,
  Check,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ArrowLeft,
  Wand2,
} from 'lucide-react';

export const LiveStandeePage: React.FC = () => {
  const {
    setStep,
    sessionData,
    setOriginalPhotoUrl,
    setCurrentGeneration,
    originalPhotoUrl,
    initializeSession,
    selectedGender,
    setSelectedGender,
    selectedCategory,
    setSelectedCategory,
    startNewExperience,
  } = useKiosk();

  const currentGender = selectedGender || 'WOMEN';
  const currentCategory = selectedCategory || (currentGender === 'WOMEN' ? 'Saree' : 'Shirt');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MOBILE'>('CAMERA');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingStageText, setLoadingStageText] = useState<string>('Analyzing your garment...');
  const [isMirror, setIsMirror] = useState<boolean>(true);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Cache to avoid uploading duplicate images
  const lastUploadedBlobRef = useRef<Blob | null>(null);
  const lastUploadedPathRef = useRef<string | null>(null);

  // Conflict validation modal state
  const [conflictData, setConflictData] = useState<{
    detectedGender: string;
    detectedCategory: string;
    detectedDescription?: string;
    message?: string;
  } | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    if (!sessionData) {
      initializeSession().catch((err) => {
        console.warn('[LiveStandee] Session initialization in background:', err?.message || err);
      });
    }
    return () => {
      stopCamera();
    };
  }, [sessionData, initializeSession]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera streaming error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleStartCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          captureFrame();
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsFlash(true);
    setTimeout(() => setIsFlash(false), 300);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    let vw = video.videoWidth || 1280;
    let vh = video.videoHeight || 720;
    const maxDim = 1440;
    if (vw > maxDim || vh > maxDim) {
      if (vw >= vh) {
        vh = Math.round((vh * maxDim) / vw);
        vw = maxDim;
      } else {
        vw = Math.round((vw * maxDim) / vh);
        vh = maxDim;
      }
    }

    canvas.width = vw;
    canvas.height = vh;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (isMirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedDataUrl(dataUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
          }
        },
        'image/jpeg',
        0.88
      );
    }
  };

  const handleRetake = () => {
    setErrorBanner(null);
    setIsConflictModalOpen(false);
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    lastUploadedBlobRef.current = null;
    lastUploadedPathRef.current = null;
    startCamera();
  };

  const executeGeneration = async (photoPath: string, genderToUse: string, categoryToUse: string) => {
    try {
      setIsProcessing(true);
      setErrorBanner(null);
      setLoadingStageText('Preparing your virtual try-on...');

      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        originalImagePath: photoPath,
        gender: genderToUse,
        category: categoryToUse,
      });

      setCurrentGeneration(gen);
      setStep('GENERATING');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        const data = err.response.data;
        setConflictData({
          detectedGender: data.detectedGender || 'MEN',
          detectedCategory: data.detectedCategory || 'Shirt',
          detectedDescription: data.detectedDescription || '',
          message: data.message || 'The detected garment does not match your selected category.',
        });
        setIsConflictModalOpen(true);
        setIsProcessing(false);
        return;
      }

      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Generation creation failed:', serverDetails, err.response?.data);
      setErrorBanner(serverDetails || 'Unable to start try-on generation. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleUseCapturedPhoto = async () => {
    if (!capturedBlob && !capturedDataUrl) return;

    try {
      setIsProcessing(true);
      setErrorBanner(null);
      setLoadingStageText('Analyzing your garment...');

      let blobToUpload = capturedBlob;
      if (!blobToUpload && capturedDataUrl) {
        const res = await fetch(capturedDataUrl);
        blobToUpload = await res.blob();
      }

      if (!blobToUpload) throw new Error('No captured photo available');

      let targetPhotoPath = lastUploadedPathRef.current;

      if (!targetPhotoPath || lastUploadedBlobRef.current !== blobToUpload) {
        setLoadingStageText('Preparing image for virtual try-on...');
        const optimizedFile = await optimizeImageFile(blobToUpload, { maxDimension: 1440, quality: 0.88 });

        const uploaded = await api.uploadImage(optimizedFile);
        targetPhotoPath = uploaded.filePath;
        lastUploadedPathRef.current = targetPhotoPath;
        lastUploadedBlobRef.current = blobToUpload;
        setOriginalPhotoUrl(uploaded.filePath);
      }

      await executeGeneration(targetPhotoPath, currentGender, currentCategory);
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.conflict) {
        const data = err.response.data;
        setConflictData({
          detectedGender: data.detectedGender || 'MEN',
          detectedCategory: data.detectedCategory || 'Shirt',
          detectedDescription: data.detectedDescription || '',
          message: data.message,
        });
        setIsConflictModalOpen(true);
        setIsProcessing(false);
        return;
      }
      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Image upload/generation failed:', serverDetails);
      setErrorBanner(serverDetails || 'Unable to upload photo. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleMobilePhotoTrigger = async () => {
    if (!originalPhotoUrl) {
      setErrorBanner('Please upload a photo from your phone first!');
      return;
    }
    await executeGeneration(originalPhotoUrl, currentGender, currentCategory);
  };

  const handleSwitchToDetected = (newGender: FashionGender, newCat: FashionCategory) => {
    setSelectedGender(newGender);
    setSelectedCategory(newCat);
    setIsConflictModalOpen(false);
    const photoToUse = originalPhotoUrl || (capturedDataUrl ? originalPhotoUrl : null);
    if (photoToUse) {
      executeGeneration(photoToUse, newGender, newCat);
    }
  };

  if (isProcessing) {
    return <ProgressScreen stage="analyzing" statusText={loadingStageText} />;
  }

  // Subtitle tailored to each garment
  const getGarmentSubtitle = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'saree':
        return 'Hold your saree fabric below chest to capture border & color';
      case 'dress':
        return 'Hold your dress in front of the camera below your chest';
      case 'shirt':
        return 'Hold your shirt in front of the camera below your chest';
      case 't-shirt':
        return 'Hold your t-shirt in front of the camera below your chest';
      case 'pant':
        return 'Hold your pants / trousers clearly in front of the camera';
      case 'kurtha':
        return 'Hold your kurtha in front of the camera below your chest';
      default:
        return `Hold your ${cat.toLowerCase()} in front of the camera below your chest`;
    }
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FAF8F3] via-[#F6F2EA] to-[#EEE8DC] text-[#111827] select-none overflow-x-hidden p-4 md:p-8">
      {/* Ambient Warm Golden Backlight */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[480px] bg-gradient-to-r from-[#D4AF37]/12 via-[#E6C670]/18 to-[#D4AF37]/12 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER BAR */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between pb-3 border-b border-[#D4AF37]/30">
        {/* Back Button */}
        <button
          onClick={() => setStep('CATEGORY_SELECT')}
          className="w-10 h-10 rounded-xl border border-[#D4AF37]/60 bg-white/90 hover:bg-white text-[#111827] flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Back to Category Selection"
        >
          <ArrowLeft className="w-5 h-5 text-[#B48425] stroke-[2.5]" />
        </button>

        {/* Start Over Button */}
        <button
          onClick={startNewExperience}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-full border border-rose-400/80 bg-white/90 hover:bg-rose-50 text-rose-600 text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Start Over</span>
        </button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-20 flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center my-auto py-3">
        {/* Flash & Countdown Overlays */}
        {isFlash && <div className="fixed inset-0 bg-white z-50 animate-ping pointer-events-none" />}

        {countdown !== null && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center">
            <span className="font-serif text-9xl font-black bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] bg-clip-text text-transparent animate-bounce drop-shadow-2xl">
              {countdown}
            </span>
          </div>
        )}

        {/* Error Banner */}
        {errorBanner && (
          <div className="z-40 w-full max-w-md mb-3 bg-red-50 border-2 border-red-500/60 rounded-2xl p-3.5 flex items-center justify-between shadow-xl">
            <p className="text-red-800 text-xs md:text-sm font-medium">{errorBanner}</p>
            <button
              onClick={() => setErrorBanner(null)}
              className="ml-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* FLOATING CATEGORY PILL */}
        <div className="z-30 flex items-center space-x-3 bg-white/95 border border-[#D4AF37]/50 px-4 py-1.5 rounded-full shadow-sm mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-[#71717A] font-bold uppercase tracking-wider">
            CATEGORY:
          </span>
          <span className="text-xs font-black uppercase text-[#111827] bg-[#FAF0D7] border border-[#E0CF9B] px-3.5 py-1 rounded-full">
            {currentGender} &bull; {currentCategory}
          </span>
          <button
            onClick={() => setStep('CATEGORY_SELECT')}
            className="flex items-center space-x-1 text-xs text-[#B48425] hover:text-[#8D6517] font-black uppercase tracking-wider pl-1 cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-0.5" />
            <span>CHANGE</span>
          </button>
        </div>

        {/* MODE SELECTOR PILL (CAMERA vs MOBILE) */}
        <div className="z-30 flex items-center p-1 bg-white/90 border border-[#D4AF37]/40 rounded-full shadow-sm mb-3">
          <button
            onClick={() => {
              setActiveTab('CAMERA');
              handleRetake();
            }}
            className={`flex items-center space-x-2 py-2 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'CAMERA'
                ? 'bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] shadow-md'
                : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>LIVE STANDEE CAMERA</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE')}
            className={`flex items-center space-x-2 py-2 px-5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'MOBILE'
                ? 'bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] shadow-md'
                : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MOBILE UPLOAD</span>
          </button>
        </div>

        {/* DYNAMIC INSTRUCTION HEADLINE */}
        <div className="z-30 text-center mb-2 space-y-1">
          <h1 className="font-serif text-3xl md:text-4xl font-black tracking-tight uppercase leading-none">
            <span className="text-[#111827]">HOLD YOUR </span>
            <span className="bg-gradient-to-r from-[#B48425] via-[#DDB85A] to-[#9C7015] bg-clip-text text-transparent">
              {currentCategory.toUpperCase()}
            </span>
          </h1>
          <p className="text-xs md:text-sm font-semibold text-[#52525B]">
            {getGarmentSubtitle(currentCategory)}
          </p>
        </div>

        {/* CAMERA VIEWPORT OR MOBILE QR VIEW */}
        {activeTab === 'CAMERA' ? (
          <div className="relative w-full max-w-2xl aspect-[3/4] max-h-[530px] rounded-3xl overflow-hidden border-2 border-[#D4AF37] shadow-[0_12px_40px_rgba(212,175,55,0.22)] flex items-center justify-center bg-black my-2">
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="Captured portrait" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isMirror ? 'transform -scale-x-100' : ''}`}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* In-camera Guideline Overlays */}
            {!capturedDataUrl && (
              <div className="absolute inset-0 pointer-events-none rounded-3xl flex flex-col items-center justify-between p-5">
                {/* Dashed Central Guideline */}
                <div className="w-72 h-[380px] border-2 border-dashed border-[#D4AF37]/90 rounded-3xl mt-1 flex flex-col items-center justify-between p-4 bg-black/25 backdrop-blur-[1.5px]">
                  {/* Head / Face Circle */}
                  <div className="w-24 h-28 border border-[#D4AF37]/80 rounded-full flex flex-col items-center justify-center bg-black/45 shadow-lg">
                    <Sparkles className="w-5 h-5 text-[#E8CB7E] mb-1 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-[#FAF0D7] tracking-wider">
                      HEAD / FACE
                    </span>
                  </div>

                  {/* Hold Garment Box */}
                  <div className="w-full py-2.5 px-3 bg-black/80 rounded-xl border border-[#D4AF37]/60 text-center shadow-lg">
                    <p className="text-xs uppercase tracking-wider text-[#FAF0D7] font-extrabold">
                      HOLD {currentCategory.toUpperCase()} BELOW CHEST
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      Step back 4-6 ft so full face &amp; torso are in frame
                    </p>
                  </div>
                </div>

                {/* Bottom Overlays */}
                <div className="w-full flex items-center justify-between px-2 pointer-events-auto">
                  {/* Mirror Toggle Button */}
                  <button
                    onClick={() => setIsMirror(!isMirror)}
                    className="bg-black/75 hover:bg-black/90 text-white border border-[#D4AF37]/50 rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{isMirror ? 'Mirror On' : 'Mirror Off'}</span>
                  </button>

                  {/* Ready Guidance Badge */}
                  <span className="bg-black/85 text-white border border-[#D4AF37]/50 rounded-full px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-wider shadow-lg">
                    READY? CENTER YOUR BODY &amp; CLICK CAPTURE PHOTO
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Mobile Upload Mode */
          <div className="w-full max-w-md my-4 flex flex-col items-center justify-center bg-white/90 border border-[#E6D8BA] rounded-3xl p-6 shadow-xl">
            {sessionData?.qrDataUrl ? (
              <QRCodePanel
                qrDataUrl={sessionData.qrDataUrl}
                lanQrDataUrl={sessionData.lanQrDataUrl}
                mobileUrl={sessionData.mobileUploadUrl}
                lanUrl={sessionData.lanUploadUrl}
                onRefresh={initializeSession}
                title="Mobile Upload QR Code"
                subtitle={`Scan to upload a photo of yourself holding a ${currentCategory}`}
              />
            ) : (
              <p className="text-[#B48425] font-bold animate-pulse">Initializing mobile session...</p>
            )}

            {originalPhotoUrl && (
              <div className="mt-6 flex flex-col items-center space-y-4">
                <div className="w-44 h-60 rounded-2xl overflow-hidden border-2 border-[#D4AF37] shadow-lg">
                  <img src={originalPhotoUrl} alt="Uploaded mobile portrait" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={handleMobilePhotoTrigger}
                  className="py-3.5 px-8 rounded-full font-black uppercase tracking-wider bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] border border-[#FFF0C7] shadow-lg flex items-center space-x-2 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                >
                  <Wand2 className="w-5 h-5" />
                  <span>START VIRTUAL TRY-ON</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PRIMARY ACTION CONTROLS (BELOW CAMERA) */}
        {activeTab === 'CAMERA' && (
          <div className="w-full max-w-2xl mt-3 flex items-center justify-center space-x-4">
            {capturedDataUrl ? (
              <>
                <button
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 py-4 px-6 rounded-2xl md:rounded-3xl uppercase font-bold text-sm md:text-base tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer bg-white border border-[#D4AF37]/60 text-[#111827] shadow-md flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5 text-[#B48425]" />
                  <span>RETAKE PHOTO</span>
                </button>

                <button
                  onClick={handleUseCapturedPhoto}
                  disabled={isProcessing}
                  className="flex-1 py-4 px-6 rounded-2xl md:rounded-3xl uppercase font-black text-sm md:text-base tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] border-2 border-[#FFF0C7] shadow-[0_10px_35px_rgba(212,175,55,0.45)] flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>START VIRTUAL TRY-ON</span>
                </button>
              </>
            ) : (
              <button
                disabled={countdown !== null || isProcessing}
                onClick={handleStartCountdown}
                className="w-full py-4 md:py-5 px-10 rounded-2xl md:rounded-3xl uppercase font-black text-base md:text-lg tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-r from-[#F6E1A7] via-[#DEBA5C] to-[#BD8C28] text-[#111827] border-2 border-[#FFF0C7] shadow-[0_10px_35px_rgba(212,175,55,0.45)] flex items-center justify-center space-x-3"
              >
                <Camera className="w-6 h-6 text-[#111827]" />
                <span>CAPTURE PHOTO</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* BOTTOM FOOTER TICKER / SLOGANS */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto flex items-end justify-between pt-4 pb-2 border-t border-[#D4AF37]/30 text-[#71717A]">
        {/* Bottom Left: SUSTAINABLE FASHION */}
        <div className="flex items-start space-x-2 text-left">
          <span className="text-[#D4AF37] font-bold text-sm leading-none mt-0.5">&mdash;</span>
          <div className="flex flex-col text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase leading-tight">
            <span>SUSTAINABLE</span>
            <span>FASHION</span>
            <span>REAL IMPACT</span>
          </div>
        </div>

        {/* Bottom Center: Powered by TRONX */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center space-x-2 text-xs md:text-sm font-bold tracking-wider text-[#374151]">
            <span className="w-6 h-[1px] bg-[#D4AF37]" />
            <span>Powered by</span>
            <span className="font-black text-[#111827]">TRON</span>
            <span className="font-black text-[#D4AF37] -ml-1">X</span>
            <span className="w-6 h-[1px] bg-[#D4AF37]" />
          </div>
          <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] text-[#9CA3AF] uppercase mt-0.5">
            TECHNOLOGY FOR A SMARTER FASHION FUTURE
          </span>
        </div>

        {/* Bottom Right: REAL OUTFITS */}
        <div className="flex items-start space-x-2 text-right justify-end">
          <div className="flex flex-col text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-[#6B7280] uppercase leading-tight">
            <span>REAL OUTFITS</span>
            <span>REAL PEOPLE</span>
            <span>REAL POSSIBILITIES</span>
          </div>
          <span className="text-[#D4AF37] font-bold text-sm leading-none mt-0.5">&mdash;</span>
        </div>
      </footer>

      {/* Garment Conflict Modal */}
      {conflictData && (
        <GarmentConflictModal
          isOpen={isConflictModalOpen}
          selectedGender={selectedGender || 'WOMEN'}
          selectedCategory={selectedCategory || 'Saree'}
          detectedGender={conflictData.detectedGender}
          detectedCategory={conflictData.detectedCategory}
          detectedDescription={conflictData.detectedDescription}
          message={conflictData.message}
          onSwitchToDetected={handleSwitchToDetected}
          onChangeCategory={() => {
            setIsConflictModalOpen(false);
            setStep('CATEGORY_SELECT');
          }}
          onRetake={handleRetake}
          onClose={() => setIsConflictModalOpen(false)}
        />
      )}
    </div>
  );
};

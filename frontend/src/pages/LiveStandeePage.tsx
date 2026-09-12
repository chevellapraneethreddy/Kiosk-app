import React, { useRef, useState, useEffect } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { QRCodePanel } from '../components/QRCodePanel';
import { api } from '../services/api';
import { Camera, Wand2, Smartphone, RotateCcw, Check, RefreshCw, Sparkles } from 'lucide-react';

export const LiveStandeePage: React.FC = () => {
  const {
    setStep,
    sessionData,
    setOriginalPhotoUrl,
    setCurrentGeneration,
    originalPhotoUrl,
    initializeSession,
  } = useKiosk();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlash, setIsFlash] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MOBILE'>('CAMERA');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMirror, setIsMirror] = useState<boolean>(true);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

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
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (isMirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedDataUrl(dataUrl);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            setCapturedBlob(blob);
          }
        },
        'image/jpeg',
        0.95
      );
    }
  };

  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const handleRetake = () => {
    setErrorBanner(null);
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleUseCapturedPhoto = async () => {
    if (!capturedBlob && !capturedDataUrl) return;

    try {
      setIsProcessing(true);
      setErrorBanner(null);
      let blobToUpload = capturedBlob;
      if (!blobToUpload && capturedDataUrl) {
        const res = await fetch(capturedDataUrl);
        blobToUpload = await res.blob();
      }

      if (!blobToUpload) throw new Error('No captured photo available');

      const file = new File([blobToUpload], `standee_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // 1. Upload captured person + held garment photo
      const uploaded = await api.uploadImage(file);
      setOriginalPhotoUrl(uploaded.filePath);

      // 2. Trigger OpenAI Virtual Try-On API (backend returns immediately with status PROCESSING)
      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        originalImagePath: uploaded.filePath,
      });

      // 3. Set generation state and transition smoothly to progress screen
      setCurrentGeneration(gen);
      setStep('GENERATING');
    } catch (err: any) {
      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Generation creation failed:', serverDetails, err.response?.data);
      setErrorBanner(serverDetails || 'Unable to start try-on generation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobilePhotoTrigger = async () => {
    if (!originalPhotoUrl) {
      setErrorBanner('Please upload a photo from your phone first!');
      return;
    }
    try {
      setIsProcessing(true);
      setErrorBanner(null);

      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        originalImagePath: originalPhotoUrl,
      });

      setCurrentGeneration(gen);
      setStep('GENERATING');
    } catch (err: any) {
      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Generation creation failed:', serverDetails, err.response?.data);
      setErrorBanner(serverDetails || 'Unable to start try-on generation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen flex flex-col justify-between bg-[#0B0D17] text-white select-none overflow-hidden">
      <Header title="Interactive AI Virtual Try-On Standee" />

      {/* Main Kiosk Vertical Display */}
      <main className="relative flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4">
        {/* Flash & Countdown Overlays */}
        {isFlash && <div className="absolute inset-0 bg-white z-50 animate-ping pointer-events-none" />}

        {countdown !== null && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center">
            <span className="text-9xl font-serif font-black gold-gradient-text animate-bounce">
              {countdown}
            </span>
          </div>
        )}

        {/* Optional Error Banner */}
        {errorBanner && (
          <div className="z-40 w-full max-w-md mb-4 bg-red-950/80 border-2 border-red-500/60 rounded-2xl p-4 flex items-center justify-between shadow-2xl backdrop-blur-md animate-fade-in">
            <p className="text-red-200 text-xs md:text-sm font-medium">{errorBanner}</p>
            <button
              onClick={() => setErrorBanner(null)}
              className="ml-3 px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 text-xs font-bold rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mode Selector Bar */}
        <div className="z-30 flex items-center justify-center p-2 glass-panel rounded-full border border-gold-500/30 mb-4 max-w-md w-full">
          <button
            onClick={() => {
              setActiveTab('CAMERA');
              handleRetake();
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all ${
              activeTab === 'CAMERA' ? 'gold-button text-black shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Live Standee Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all ${
              activeTab === 'MOBILE' ? 'gold-button text-black shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Mobile Upload</span>
          </button>
        </div>

        {/* Instruction Header */}
        <div className="z-30 text-center mb-4 space-y-1">
          <h1 className="font-serif text-3xl md:text-4xl font-black gold-gradient-text uppercase tracking-wide">
            SHOW YOUR GARMENT
          </h1>
          <p className="text-sm md:text-base font-semibold text-gray-200">
            Hold any dress / saree / shirt in front of the camera
          </p>
        </div>

        {/* Center Camera Feed or Captured Photo Preview */}
        {activeTab === 'CAMERA' ? (
          <div className="relative w-full max-w-2xl aspect-[3/4] max-h-[580px] rounded-3xl overflow-hidden glass-panel border-4 border-gold-500/50 shadow-2xl flex items-center justify-center bg-black">
            {capturedDataUrl ? (
              // Captured Photo Preview Mode
              <img src={capturedDataUrl} alt="Captured photo" className="w-full h-full object-cover" />
            ) : (
              // Live Mirror Camera Feed
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isMirror ? 'transform -scale-x-100' : ''}`}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />

            {/* Pose Guideline Box */}
            {!capturedDataUrl && (
              <div className="absolute inset-0 pointer-events-none border-4 border-gold-500/20 rounded-3xl flex flex-col items-center justify-between p-6">
                <div className="w-72 h-[420px] border-2 border-dashed border-gold-400/80 rounded-3xl mt-2 flex flex-col items-center justify-between p-4 text-center bg-black/30 backdrop-blur-[2px]">
                  <div className="w-24 h-28 border border-gold-400/50 rounded-full flex flex-col items-center justify-center bg-gold-500/10">
                    <Sparkles className="w-6 h-6 text-gold-400 mb-1 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold text-gold-300">Head / Face</span>
                  </div>
                  <div className="w-full py-2 px-3 bg-black/70 rounded-xl border border-gold-500/40">
                    <p className="text-xs uppercase tracking-wider text-gold-300 font-extrabold">
                      Hold Garment Below Chest
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      Step back 4-6 ft so your full face & torso are in frame
                    </p>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-widest text-gold-300 bg-black/85 px-6 py-2 rounded-full border border-gold-500/40 font-bold shadow-lg">
                  Ready? Stand centered & click CAPTURE PHOTO
                </p>
              </div>
            )}

            {/* Mirror Toggle Button */}
            {!capturedDataUrl && (
              <button
                onClick={() => setIsMirror(!isMirror)}
                className="absolute bottom-4 left-4 z-30 p-3 rounded-2xl bg-black/60 hover:bg-black/80 text-gold-400 border border-gold-500/40 text-xs font-semibold flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isMirror ? 'Mirror On' : 'Mirror Off'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md my-4 flex flex-col items-center justify-center">
            {sessionData?.qrDataUrl ? (
              <QRCodePanel
                qrDataUrl={sessionData.qrDataUrl}
                lanQrDataUrl={sessionData.lanQrDataUrl}
                mobileUrl={sessionData.mobileUploadUrl}
                lanUrl={sessionData.lanUploadUrl}
                onRefresh={initializeSession}
                title="Mobile Upload QR Code"
                subtitle="Scan with your phone camera to upload a photo of yourself holding a saree/dress"
              />
            ) : (
              <p className="text-gold-400 animate-pulse">Initializing mobile session...</p>
            )}

            {originalPhotoUrl && (
              <div className="mt-6 flex flex-col items-center space-y-4">
                <div className="w-44 h-60 rounded-2xl overflow-hidden glass-panel border-2 border-gold-400">
                  <img src={originalPhotoUrl} alt="Uploaded mobile photo" className="w-full h-full object-cover" />
                </div>
                <Button variant="primary" size="lg" onClick={handleMobilePhotoTrigger}>
                  <Wand2 className="w-6 h-6 mr-2" />
                  <span>START VIRTUAL TRY-ON</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls Bar */}
        {activeTab === 'CAMERA' && (
          <div className="w-full max-w-2xl mt-4 glass-panel p-4 rounded-3xl border border-gold-500/30 z-30 flex items-center justify-center space-x-4 shadow-2xl">
            {capturedDataUrl ? (
              <>
                <Button variant="secondary" size="lg" onClick={handleRetake} disabled={isProcessing}>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  <span>RETAKE PHOTO</span>
                </Button>

                <Button variant="primary" size="xl" onClick={handleUseCapturedPhoto} disabled={isProcessing}>
                  <Check className="w-6 h-6 mr-2" />
                  <span>START VIRTUAL TRY-ON</span>
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="xl"
                disabled={countdown !== null || isProcessing}
                onClick={handleStartCountdown}
                className="w-full py-5 text-xl font-extrabold shadow-2xl shadow-gold-500/30 scale-105"
              >
                <Camera className="w-8 h-8 mr-3" />
                <span>CAPTURE PHOTO</span>
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

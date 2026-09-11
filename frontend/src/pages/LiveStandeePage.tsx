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
        video: { width: { ideal: 1280 }, height: { ideal: 1706 }, facingMode: 'user' },
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
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;

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

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handleUseCapturedPhoto = async () => {
    if (!capturedBlob && !capturedDataUrl) return;

    try {
      setIsProcessing(true);
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

      // 2. Advance to Generating screen
      setStep('GENERATING');

      // 3. Trigger Decart Virtual Try-On API (with automatic held garment extraction)
      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        originalImagePath: uploaded.filePath,
      });

      setCurrentGeneration(gen);
    } catch (err: any) {
      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Generation creation failed:', serverDetails, err.response?.data);
      alert(`Virtual try-on failed\n\nPlease try again.\n(${serverDetails})`);
      setStep('LIVE_STANDEE');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobilePhotoTrigger = async () => {
    if (!originalPhotoUrl) {
      alert('Please upload a photo from your phone first!');
      return;
    }
    try {
      setIsProcessing(true);
      setStep('GENERATING');

      const gen = await api.createGeneration({
        sessionId: sessionData?.session?.id,
        originalImagePath: originalPhotoUrl,
      });

      setCurrentGeneration(gen);
    } catch (err: any) {
      const serverDetails = err.response?.data?.details || err.response?.data?.error || err.message;
      console.error('[TRYON Frontend] Generation creation failed:', serverDetails, err.response?.data);
      alert(`Virtual try-on failed\n\nPlease try again.\n(${serverDetails})`);
      setStep('LIVE_STANDEE');
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
                <div className="w-64 h-96 border-2 border-dashed border-gold-400/70 rounded-3xl mt-4 flex flex-col items-center justify-center p-4 text-center bg-black/30 backdrop-blur-[2px]">
                  <Sparkles className="w-8 h-8 text-gold-400 mb-2 animate-bounce" />
                  <p className="text-xs uppercase tracking-widest text-gold-300 font-bold px-3 py-1.5 bg-black/70 rounded-xl border border-gold-500/30">
                    Hold Garment Clearly In Frame
                  </p>
                </div>
                <p className="text-xs uppercase tracking-widest text-gold-300 bg-black/80 px-5 py-2 rounded-full border border-gold-500/40 font-bold">
                  Ready? Click CAPTURE PHOTO below
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

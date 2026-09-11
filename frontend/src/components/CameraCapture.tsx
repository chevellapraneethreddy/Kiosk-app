import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (file: File, previewUrl: string) => void;
  onFallbackUpload: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onFallbackUpload }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlash, setIsFlash] = useState<boolean>(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 1706 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or device unavailable. Please use file upload below.');
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
          takeSnapshot();
          return null;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsFlash(true);
    setTimeout(() => setIsFlash(false), 300);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror image horizontally for front camera feel
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          setCapturedImage(url);
          setCapturedFile(file);
        }
      }, 'image/jpeg', 0.92);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedFile && capturedImage) {
      onCapture(capturedFile, capturedImage);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-xl mx-auto">
      {cameraError ? (
        <div className="glass-panel p-8 rounded-3xl text-center flex flex-col items-center space-y-6 border-red-500/40">
          <AlertCircle className="w-16 h-16 text-red-400" />
          <p className="text-xl text-red-200">{cameraError}</p>
          <Button variant="primary" onClick={onFallbackUpload}>
            Use Upload Option
          </Button>
        </div>
      ) : (
        <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden glass-panel border-2 border-gold-500/40 shadow-2xl flex items-center justify-center">
          {/* Camera Flash Animation */}
          {isFlash && <div className="absolute inset-0 bg-white z-40 animate-ping" />}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <span className="text-9xl font-serif font-black gold-gradient-text animate-bounce">
                {countdown}
              </span>
            </div>
          )}

          {/* Live Video Feed or Captured Preview */}
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <img src={capturedImage} alt="Captured preview" className="w-full h-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Guidelines Overlay */}
          {!capturedImage && (
            <div className="absolute inset-0 pointer-events-none border-4 border-gold-500/20 rounded-3xl flex flex-col items-center justify-between p-6">
              <div className="w-48 h-64 border-2 border-dashed border-gold-400/50 rounded-full mt-12 opacity-60" />
              <p className="text-sm uppercase tracking-widest text-gold-300 bg-black/50 px-4 py-2 rounded-full">
                Position your face inside the frame
              </p>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center space-x-6 w-full">
        {!capturedImage ? (
          <Button variant="primary" size="xl" onClick={handleStartCountdown} disabled={countdown !== null || Boolean(cameraError)}>
            <Camera className="w-8 h-8 mr-3" />
            <span>Capture Photo</span>
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="lg" onClick={handleRetake}>
              <RefreshCw className="w-6 h-6 mr-2" />
              <span>Retake</span>
            </Button>
            <Button variant="primary" size="lg" onClick={handleConfirm}>
              <Check className="w-6 h-6 mr-2" />
              <span>Continue</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

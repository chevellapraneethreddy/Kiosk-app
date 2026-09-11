import React, { useState } from 'react';
import { useKiosk } from '../context/KioskContext';
import { Header } from '../components/Header';
import { CameraCapture } from '../components/CameraCapture';
import { ImageUploader } from '../components/ImageUploader';
import { QRCodePanel } from '../components/QRCodePanel';
import { Camera, Upload, Smartphone } from 'lucide-react';
import { api } from '../services/api';

type Tab = 'CAMERA' | 'UPLOAD' | 'MOBILE';

export const PhotoInputPage: React.FC = () => {
  const { setStep, setOriginalPhotoUrl, sessionData, selectedExperience } = useKiosk();
  const [activeTab, setActiveTab] = useState<Tab>('CAMERA');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleCapturedPhoto = async (file: File) => {
    try {
      setIsUploading(true);
      const uploaded = await api.uploadImage(file);
      setOriginalPhotoUrl(uploaded.filePath);
      setStep('PHOTO_PREVIEW');
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E]">
      <Header title={`Step 2: Provide Photo for ${selectedExperience?.name || 'Experience'}`} onBack={() => setStep('EXPERIENCE')} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-8 py-8 flex flex-col items-center justify-center">
        {/* Input Option Selector Tabs */}
        <div className="flex items-center justify-center p-2 glass-panel rounded-3xl mb-8 border border-gold-500/30 w-full max-w-xl">
          <button
            onClick={() => setActiveTab('CAMERA')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold uppercase tracking-wider text-base transition-all ${
              activeTab === 'CAMERA' ? 'gold-button text-black shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('UPLOAD')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold uppercase tracking-wider text-base transition-all ${
              activeTab === 'UPLOAD' ? 'gold-button text-black shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('MOBILE')}
            className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold uppercase tracking-wider text-base transition-all ${
              activeTab === 'MOBILE' ? 'gold-button text-black shadow-lg' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {isUploading ? (
          <div className="text-center text-gold-400 font-serif text-2xl animate-pulse my-auto">
            Processing and optimizing photo...
          </div>
        ) : (
          <div className="w-full flex justify-center">
            {activeTab === 'CAMERA' && (
              <CameraCapture onCapture={handleCapturedPhoto} onFallbackUpload={() => setActiveTab('UPLOAD')} />
            )}

            {activeTab === 'UPLOAD' && (
              <ImageUploader onFileSelect={handleCapturedPhoto} />
            )}

            {activeTab === 'MOBILE' && (
              <div className="flex flex-col items-center text-center space-y-6">
                {sessionData?.qrDataUrl ? (
                  <QRCodePanel
                    qrDataUrl={sessionData.qrDataUrl}
                    title="Mobile Upload QR Code"
                    subtitle="Scan with your smartphone to upload a photo directly to this kiosk"
                  />
                ) : (
                  <p className="text-gold-400 animate-pulse">Initializing mobile session QR...</p>
                )}
                <p className="text-sm text-gray-300 max-w-md">
                  Once you capture or select a photo on your phone, it will automatically appear here on the kiosk screen!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

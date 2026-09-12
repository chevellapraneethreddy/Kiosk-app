import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const MobileUploadPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!token || !selectedFile) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);
      await api.mobileUploadPhoto(token, selectedFile);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err.message || 'Mobile photo upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E] text-white p-6 flex flex-col justify-between items-center text-center">
      {/* Mobile Branding Header */}
      <header className="w-full py-4 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center mb-2">
          <Sparkles className="w-6 h-6 text-gold-400" />
        </div>
        <h1 className="font-serif text-2xl font-bold gold-gradient-text uppercase">
          ROYAL AI STANDEE
        </h1>
        <p className="text-xs text-gray-300">Mobile Kiosk Photo Upload</p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md my-auto flex flex-col items-center">
        {isSuccess ? (
          <div className="glass-panel p-8 rounded-3xl border-2 border-green-500/40 shadow-2xl flex flex-col items-center">
            <CheckCircle2 className="w-20 h-20 text-green-400 mb-4 animate-bounce" />
            <h2 className="font-serif text-3xl font-bold text-white mb-2">Photo Uploaded!</h2>
            <p className="text-gray-300 text-lg mb-6">
              Your photo has been sent to the AI Standee screen. Look up at the kiosk to continue!
            </p>
          </div>
        ) : (
          <div className="w-full glass-panel p-6 rounded-3xl border border-gold-500/30 flex flex-col items-center">
            <h2 className="font-serif text-2xl font-bold text-white mb-4">
              Upload Photo to Kiosk
            </h2>

            {/* Preview Box */}
            <div className="w-full aspect-[3/4] max-h-[360px] rounded-2xl overflow-hidden glass-card border-2 border-gold-500/30 mb-6 flex items-center justify-center relative bg-black/40">
              {previewUrl ? (
                <img src={previewUrl} alt="Upload preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center p-6 text-center text-gray-400">
                  <Camera className="w-12 h-12 text-gold-400 mb-3" />
                  <span>Take a photo holding your garment (saree, dress, shirt, t-shirt, pant, or kurtha)</span>
                </div>
              )}
            </div>

            {/* Input buttons */}
            <div className="w-full space-y-4">
              <label className="block w-full">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="gold-button text-black font-extrabold uppercase py-4 rounded-2xl w-full flex items-center justify-center text-lg shadow-lg cursor-pointer">
                  <Upload className="w-6 h-6 mr-2" />
                  <span>Choose Photo</span>
                </span>
              </label>

              {selectedFile && (
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-extrabold uppercase py-4 rounded-2xl text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading to Kiosk...' : 'Send Photo to Kiosk'}
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="mt-4 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="w-full py-4 text-xs text-gray-500 uppercase tracking-widest text-center">
        Powered by AI Digital Standee
      </footer>
    </div>
  );
};

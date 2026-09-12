import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Download, Share2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { ResultResponse } from '../types';

export const MobileResultPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<ResultResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'OUTPUT' | 'INPUT'>('OUTPUT');

  useEffect(() => {
    if (token) loadResult();
  }, [token]);

  const loadResult = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getResultByToken(token!);
      setResult(data);
    } catch (err: any) {
      if (err.response?.status === 410 || err.response?.data?.expired) {
        setIsExpired(true);
      } else {
        setErrorMsg(err.response?.data?.error || 'Result image not found or link has expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [downloading, setDownloading] = useState<boolean>(false);

  const handleDownload = async () => {
    if (!result?.generation?.generatedImagePath) return;
    try {
      setDownloading(true);
      const res = await fetch(result.generation.generatedImagePath, { mode: 'cors' });
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `AI_Virtual_TryOn_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      console.warn('Blob download fallback to direct link:', e);
      window.open(result.generation.generatedImagePath, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My AI Virtual Try-On Look',
          text: 'Check out my AI Virtual Try-On photo!',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D17] via-[#161B33] to-[#2A1B4E] text-white p-4 flex flex-col justify-between items-center text-center select-none">
      {/* Mobile Header */}
      <header className="w-full py-3 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-400 flex items-center justify-center mb-1">
          <Sparkles className="w-5 h-5 text-gold-400" />
        </div>
        <h1 className="font-serif text-xl font-black gold-gradient-text uppercase tracking-wider">
          AI VIRTUAL TRY-ON
        </h1>
        <p className="text-xs text-gold-300 font-semibold">YOUR LOOK IS READY!</p>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md my-auto flex flex-col items-center py-2">
        {loading ? (
          <div className="text-gold-400 font-serif text-xl animate-pulse py-12">
            Loading your high-res AI image...
          </div>
        ) : isExpired ? (
          <div className="glass-panel p-8 rounded-3xl border-2 border-red-500/40 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-white mb-2">Image Expired</h2>
            <p className="text-gray-300 text-sm">
              This generated image link has expired. Please visit the kiosk to create a new look!
            </p>
          </div>
        ) : errorMsg ? (
          <div className="glass-panel p-8 rounded-3xl border-2 border-red-500/40 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-white mb-2">Result Unavailable</h2>
            <p className="text-gray-300 text-sm">{errorMsg}</p>
          </div>
        ) : (
          <div className="w-full glass-panel p-5 rounded-3xl border-2 border-gold-500/40 flex flex-col items-center shadow-2xl space-y-4">
            
            <div className="relative w-full aspect-[9/16] max-h-[70vh] rounded-2xl overflow-hidden glass-card border-2 border-gold-400/50 shadow-xl bg-black flex items-center justify-center">
              {result?.generation?.generatedImagePath ? (
                <img
                  src={result.generation.generatedImagePath}
                  alt="AI Generated Virtual Try-On"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No generated image available
                </div>
              )}

              <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gold-500/40 text-center">
                <p className="text-xs text-gold-300 font-bold uppercase tracking-wider">
                  ✨ YOUR AI VIRTUAL TRY-ON LOOK
                </p>
              </div>
            </div>

            {/* Specs Badges */}
            <div className="w-full flex items-center justify-around bg-black/50 py-2 px-3 rounded-xl border border-gold-500/20 text-[11px] font-bold text-gold-300">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Same Person</span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Same Garment</span>
              </span>
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Realistic Fit</span>
              </span>
            </div>

            {/* Action Buttons: Download Photo & Share Photo */}
            <div className="w-full space-y-3 pt-1">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="gold-button text-black font-extrabold uppercase py-3.5 rounded-2xl w-full flex items-center justify-center text-base shadow-xl active:scale-95 disabled:opacity-50"
              >
                <Download className="w-5 h-5 mr-2" />
                <span>{downloading ? 'SAVING PHOTO...' : 'DOWNLOAD PHOTO'}</span>
              </button>

              <button
                onClick={handleShare}
                className="w-full bg-royal-800 hover:bg-royal-700 text-white font-bold uppercase py-3.5 rounded-2xl border border-gold-500/30 flex items-center justify-center text-base shadow-lg active:scale-95"
              >
                <Share2 className="w-5 h-5 mr-2" />
                <span>SHARE PHOTO</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full py-2 text-[10px] text-gray-400 uppercase tracking-widest text-center">
        ✨ Real Virtual Try-On Kiosk • Powered by OpenAI ✨
      </footer>
    </div>
  );
};


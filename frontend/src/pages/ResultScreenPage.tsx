import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useKiosk } from '../context/KioskContext';
import { ResultViewer } from '../components/ResultViewer';
import { api } from '../services/api';
import { preloadAndDecodeImage } from '../utils/imageOptimizer';

export const ResultScreenPage: React.FC = () => {
  const { resultData, currentGeneration, startNewExperience } = useKiosk();
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const activeToken = routeToken || queryToken;

  const [remoteData, setRemoteData] = useState<{
    generatedImageUrl: string;
    qrDataUrl: string;
    lanQrDataUrl?: string;
    publicResultUrl?: string;
    lanResultUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (activeToken && (!resultData || !resultData.qrDataUrl)) {
      setLoading(true);
      api.getResultByToken(activeToken)
        .then(async (res) => {
          if (res?.generation?.generatedImagePath) {
            await preloadAndDecodeImage(res.generation.generatedImagePath);
            setRemoteData({
              generatedImageUrl: res.generation.generatedImagePath,
              qrDataUrl: res.qrDataUrl || '',
              lanQrDataUrl: res.lanQrDataUrl,
              publicResultUrl: res.publicResultUrl,
              lanResultUrl: res.lanResultUrl,
            });
          }
        })
        .catch((err) => {
          console.error('Failed to load result for token:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [activeToken, resultData]);

  const generatedImageUrl =
    resultData?.generation?.generatedImagePath ||
    currentGeneration?.generatedImagePath ||
    remoteData?.generatedImageUrl ||
    '';
  const qrDataUrl = resultData?.qrDataUrl || remoteData?.qrDataUrl || '';
  const lanQrDataUrl = resultData?.lanQrDataUrl || remoteData?.lanQrDataUrl;
  const publicResultUrl = resultData?.publicResultUrl || remoteData?.publicResultUrl;
  const lanResultUrl = resultData?.lanResultUrl || remoteData?.lanResultUrl;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden z-50 bg-black">
      {generatedImageUrl && qrDataUrl ? (
        <ResultViewer
          generatedImageUrl={generatedImageUrl}
          qrDataUrl={qrDataUrl}
          lanQrDataUrl={lanQrDataUrl}
          publicResultUrl={publicResultUrl}
          lanResultUrl={lanResultUrl}
          onStartOver={startNewExperience}
        />
      ) : loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0D17] text-[#dfb858] font-serif text-2xl font-bold animate-pulse">
          Loading your AI virtual fashion look...
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0D17] text-[#dfb858] font-serif text-2xl font-bold animate-pulse">
          Rendering your high-resolution AI fashion look...
        </div>
      )}
    </div>
  );
};


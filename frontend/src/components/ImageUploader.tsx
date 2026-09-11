import React, { useState } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  maxSizeMB?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, maxSizeMB = 15 }) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndProcess = (file: File) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, or WEBP photo.');
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds maximum limit of ${maxSizeMB}MB.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`w-full aspect-[4/3] rounded-3xl border-3 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center glass-panel ${
          isDragOver ? 'border-gold-400 bg-royal-700/80 scale-[1.02]' : 'border-gold-500/40 hover:border-gold-400'
        }`}
      >
        <div className="w-20 h-20 rounded-full bg-gold-500/10 flex items-center justify-center border border-gold-500/30 mb-6">
          <Upload className="w-10 h-10 text-gold-400" />
        </div>

        <h3 className="font-serif text-2xl font-bold gold-gradient-text mb-2">
          Upload Your Photo
        </h3>
        <p className="text-gray-300 mb-6">
          Drag & drop your portrait image here, or browse files from your device
        </p>

        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
          <span className="gold-button text-black font-extrabold uppercase px-8 py-4 rounded-2xl tracking-wider text-lg inline-block">
            Browse Photo
          </span>
        </label>

        <div className="mt-6 flex items-center text-xs text-gray-400 space-x-3">
          <ImageIcon className="w-4 h-4 text-gold-400" />
          <span>Supports JPG, PNG, WEBP (Max {maxSizeMB}MB)</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

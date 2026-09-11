import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-8 border border-gold-500/30 shadow-2xl relative">
        <div className="flex items-center justify-between pb-6 border-b border-gold-500/20">
          <h2 className="font-serif text-2xl font-bold gold-gradient-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-royal-800 text-gray-300 hover:text-white hover:bg-royal-700 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="py-6 text-gray-200 text-lg leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

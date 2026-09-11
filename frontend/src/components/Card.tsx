import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, selected }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-card rounded-3xl p-6 transition-all duration-300 relative overflow-hidden',
        onClick && 'cursor-pointer hover:border-gold-500/60 hover:shadow-xl hover:shadow-gold-500/10 active:scale-[0.98]',
        selected && 'border-2 border-gold-400 shadow-2xl shadow-gold-500/20 bg-royal-700/80',
        className
      )}
    >
      {selected && (
        <div className="absolute top-4 right-4 bg-gold-500 text-black p-2 rounded-full shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      {children}
    </div>
  );
};

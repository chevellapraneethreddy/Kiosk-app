import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variantStyles = {
    primary: 'gold-button text-black font-extrabold shadow-lg shadow-gold-500/20 hover:brightness-110',
    secondary: 'bg-royal-800 text-white border border-gold-500/30 hover:bg-royal-700 shadow-md',
    outline: 'bg-transparent text-gold-400 border-2 border-gold-500 hover:bg-gold-500/10',
    danger: 'bg-red-600/80 text-white hover:bg-red-600 border border-red-500/50',
  };

  const sizeStyles = {
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-5 text-lg min-h-[64px] text-xl',
    xl: 'px-10 py-6 text-xl min-h-[76px] text-2xl tracking-widest',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

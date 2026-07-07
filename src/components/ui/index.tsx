import React from 'react';

export const ClipStaffLogo = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Interlocking S & J Monogram */}
    <path
      d="M28.2 39L35.2 46.1C35.2 59.8 35.1 61.2 35.1 63C35.1 69.2 40.2 73.1 48 73.1C55.8 73.1 64.9 69.2 64.9 63V20H72.4V63C72.4 79.5 59.5 83 48 83C36.5 83 20.8 79.5 20.8 63V39H28.2Z"
      fill="currentColor"
    />
    <path
      d="M48 17C61.3 17 64.9 26.5 64.9 36H57.4C57.4 28.5 54.3 23.8 48 23.8C41.7 23.8 38.6 28.5 38.6 36C38.6 42.6 42.1 45.4 50.1 49.3C61.4 54.8 68 58.6 68 68.2C68 77.7 59.8 83 48 83C36.2 83 28 77.7 28 68.2H35.5C35.5 75.7 39.8 76.2 48 76.2C56.2 76.2 60.5 75.7 60.5 68.2C60.5 61.6 57 58.8 49 54.9C37.6 49.4 31.1 45.6 31.1 36C31.1 26.5 39.3 17 48 17Z"
      fill="currentColor"
    />
  </svg>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const Card = ({ children, className = '', onClick, isActive }: CardProps) => (
  <div 
    onClick={onClick}
    className={`
      bg-carbon border rounded-xl p-5 transition-all duration-150
      ${isActive ? 'border-accent shadow-sm' : 'border-graphite hover:border-smoke shadow-sm'}
      ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  icon, 
  className = '', 
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: 'bg-accent hover:bg-accent-light text-void shadow-sm border border-transparent',
    secondary: 'bg-white/5 hover:bg-white/10 text-mist border border-graphite',
    ghost: 'bg-transparent hover:bg-white/5 text-ash hover:text-mist border border-transparent',
    danger: 'bg-coral-red/10 hover:bg-coral-red/20 text-coral-red border border-coral-red/20'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-4 py-2 text-xs',
    lg: 'px-6 py-3 text-sm'
  };

  return (
    <button
      className={`
        flex items-center justify-center gap-1.5 font-medium tracking-tight 
        rounded-md transition-all duration-150 disabled:opacity-50
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
};

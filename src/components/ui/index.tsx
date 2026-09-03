export { ClipStaffLogo } from './ClipStaffLogo';

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
    primary: 'bg-accent hover:bg-accent-light text-void shadow-sm border border-transparent hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-white/5 hover:bg-white/10 text-mist border border-graphite hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'bg-transparent hover:bg-white/5 text-ash hover:text-mist border border-transparent',
    danger: 'bg-coral-red/10 hover:bg-coral-red/20 text-coral-red border border-coral-red/20 hover:-translate-y-0.5 active:translate-y-0'
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

export { ErrorBoundary } from './ErrorBoundary';


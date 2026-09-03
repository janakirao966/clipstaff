import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface ClipStaffLogoProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  size?: number;
  className?: string;
  animateMotion?: 'float' | 'swing' | 'pulse' | 'none';
  withGlow?: boolean;
  glowColor?: string;
}

export const ClipStaffLogo: React.FC<ClipStaffLogoProps> = ({
  size = 32,
  className = '',
  animateMotion = 'float',
  withGlow = false,
  glowColor = 'rgba(228, 242, 34, 0.25)',
  ...motionProps
}) => {
  // Motion animation variants
  const getMotionAnimation = () => {
    switch (animateMotion) {
      case 'float':
        return {
          y: [0, -5, 0],
          rotate: [0, 1, -1, 0],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'swing':
        return {
          y: [0, -8, 0],
          rotate: [0, 3, -3, 0],
          transition: {
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'pulse':
        return {
          y: [0, -10, 0],
          scale: [1, 1.04, 1],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };
      case 'none':
      default:
        return {};
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Ambient Radial Glow Backdrop */}
      {withGlow && (
        <motion.div
          className="absolute inset-0 rounded-2xl blur-xl pointer-events-none"
          style={{ background: glowColor }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Floating Animated Logo Container */}
      <motion.div
        className="relative z-10 flex items-center justify-center cursor-pointer"
        animate={getMotionAnimation()}
        whileHover={{ scale: 1.06, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.94 }}
        {...motionProps}
      >
        <div
          className="overflow-hidden rounded-2xl border border-white/15 bg-black/40 shadow-lg shadow-black/40 backdrop-blur-sm p-0.5"
          style={{ width: size, height: size }}
        >
          <img
            src="/logo.webp"
            alt="ClipStaff Logo"
            width={size}
            height={size}
            className="w-full h-full object-cover rounded-[14px]"
            loading="eager"
            onError={(e) => {
              // Fallback to png if webp fails
              const target = e.currentTarget;
              if (!target.src.endsWith('icon128.png')) {
                target.src = '/icons/icon128.png';
              }
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

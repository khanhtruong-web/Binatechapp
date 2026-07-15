import React from 'react';

interface BinatechLogoProps {
  collapsed?: boolean;
  className?: string;
  variant?: 'dark' | 'light';
}

export default function BinatechLogo({ collapsed = false, className = '', variant = 'dark' }: BinatechLogoProps) {
  const isDark = variant === 'dark';
  
  // Color configuration
  const textColorPrimary = '#0EA5E9'; // Cyan-500
  const textColorSecondary = isDark ? '#E2E8F0' : '#1E3A8A'; // Slate-200 on dark, Navy on light
  const starColor = isDark ? '#38BDF8' : '#1E3A8A'; // Sky-400 on dark, Navy on light
  
  if (collapsed) {
    // 3D Glassmorphism Logo Icon for collapsed state
    return (
      <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/80 to-indigo-600/90 shadow-lg shadow-indigo-500/20 backdrop-blur-md border border-white/20 overflow-hidden ${className}`}>
        {/* Glow backdrop effect */}
        <div className="absolute inset-0 bg-radial-gradient from-white/30 to-transparent pointer-events-none" />
        
        <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] animate-pulse-glow">
          {/* Paper Plane Icon */}
          <path d="M 15 45 L 85 20 L 50 80 L 40 55 L 15 45 Z" fill="#E0F2FE" />
          <path d="M 85 20 L 40 55 L 60 85 L 85 20 Z" fill="#0EA5E9" />
          <path d="M 40 55 L 50 80 L 60 85 L 40 55 Z" fill="#0284C7" />
          
          {/* Small star dots */}
          <circle cx="25" cy="75" r="3" fill="#BAE6FD" />
          <circle cx="35" cy="85" r="2.5" fill="#BAE6FD" />
          <circle cx="15" cy="65" r="2.5" fill="#BAE6FD" />
        </svg>
      </div>
    );
  }

  // Full Brand Logo in normal state
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 3D Glassmorphism Logo Icon */}
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/80 to-indigo-600/90 shadow-md shadow-indigo-500/20 backdrop-blur-md border border-white/10 overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 bg-radial-gradient from-white/20 to-transparent pointer-events-none" />
        <svg viewBox="0 0 100 100" className="w-6.5 h-6.5 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.2)]">
          <path d="M 15 45 L 85 20 L 50 80 L 40 55 L 15 45 Z" fill="#E0F2FE" />
          <path d="M 85 20 L 40 55 L 60 85 L 85 20 Z" fill="#0EA5E9" />
          <path d="M 40 55 L 50 80 L 60 85 L 40 55 Z" fill="#0284C7" />
        </svg>
      </div>
      
      {/* Brand Text Content */}
      <div className="flex flex-col select-none leading-none">
        <span 
          className="text-[22px] font-black tracking-tight" 
          style={{ color: textColorPrimary, fontFamily: "'Inter', sans-serif" }}
        >
          BinaTech
        </span>
        <span 
          className="text-[9.5px] font-extrabold tracking-[2px] mt-0.5 text-left uppercase"
          style={{ color: textColorSecondary }}
        >
          ON THE RIGHT
        </span>
      </div>

      {/* Trailing Stars (for beautiful visual finish) */}
      <svg className="w-5 h-5 flex-shrink-0 -ml-1 mt-1 opacity-70" viewBox="0 0 24 24">
        {/* Star 1 */}
        <path d="M 4 8 Q 6 8 6 6 Q 6 8 8 8 Q 6 8 6 10 Q 6 8 4 8 Z" fill={starColor} />
        {/* Star 2 */}
        <path d="M 12 16 Q 13.5 16 13.5 14.5 Q 13.5 16 15 16 Q 13.5 16 13.5 17.5 Q 13.5 16 12 16 Z" fill={starColor} />
      </svg>
    </div>
  );
}

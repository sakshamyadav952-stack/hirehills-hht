
'use client';

export function NishkaCoinIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 100" 
      className="w-full h-full"
    >
      <defs>
        <radialGradient id="nishka-gold-grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" stopColor="#FFFDE4" />
          <stop offset="60%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
        <filter id="nishka-glow">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      
      {/* Base Coin */}
      <circle cx="50" cy="50" r="48" fill="url(#nishka-gold-grad)" stroke="#A87900" strokeWidth="2.5" />

      {/* Rim */}
      <circle cx="50" cy="50" r="42" fill="none" stroke="#A87900" strokeWidth="1.5" opacity="0.7" />

      {/* 'B' for Blistree */}
      <text 
        x="50" 
        y="68" 
        fontFamily="'Inter', sans-serif" 
        fontSize="50" 
        fontWeight="bold" 
        fill="#8B4513" 
        textAnchor="middle"
        style={{ filter: 'drop-shadow(1px 1px 0px #FFFDE4)' }}
      >
        B
      </text>

      {/* Glint effect */}
      <path 
        d="M25 25 Q50 20, 75 25" 
        fill="none" 
        stroke="#FFFDE4" 
        strokeWidth="2" 
        strokeLinecap="round" 
        opacity="0.9"
        className="coin-glint"
      />
    </svg>
  );
}

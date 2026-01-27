
'use client';

export function PotIcon() {
  return (
    <svg 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="pot-shine" cx="0.5" cy="0.2" r="0.8">
          <stop offset="0%" stopColor="#FFFDE4" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </radialGradient>
          <filter id="pot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
            <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
      </defs>
      
      {/* Pot Body */}
      <path 
        d="M 20 95 
            Q 15 50, 30 35 
            L 35 25 
            C 40 15, 60 15, 65 25 
            L 70 35 
            Q 85 50, 80 95 
            Z" 
        fill="url(#pot-shine)" 
        filter="url(#pot-glow)"
        stroke="#A87900"
        strokeWidth="2"
      />
      
      {/* Pot Opening */}
      <ellipse cx="50" cy="25" rx="16" ry="5" fill="#6B4F00"/>
      
      {/* Ancient Design on Pot */}
      <g fill="#A87900" opacity="0.6">
          <path d="M 40 45 Q 50 50, 60 45" stroke="#A87900" strokeWidth="1" fill="none" />
          <path d="M 35 60 Q 50 68, 65 60" stroke="#A87900" strokeWidth="1.5" fill="none" />
          <path d="M 38 75 Q 50 82, 62 75" stroke="#A87900" strokeWidth="1" fill="none" />
          <text x="50" y="66" fontSize="20" fontFamily="serif" fontWeight="bold" textAnchor="middle" fill="#8B4513" filter="url(#pot-glow)">
              N
          </text>
      </g>

      {/* Pot Rim */}
      <path d="M 35 25 C 40 20, 60 20, 65 25" fill="none" stroke="#C09000" strokeWidth="2.5"/>
    </svg>
  );
}

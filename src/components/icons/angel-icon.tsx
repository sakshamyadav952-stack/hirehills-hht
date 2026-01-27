
'use client';

export function AngelIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 200"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="skin" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="#fde3c2" />
          <stop offset="100%" stopColor="#f5c6a1" />
        </linearGradient>
        <linearGradient id="robe" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f0f0f8" />
        </linearGradient>
        <linearGradient id="wing" x1="0.5" x2="0.5" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#f0f8ff" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id="halo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="70%" stopColor="#fff9c4" stopOpacity="1"/>
          <stop offset="100%" stopColor="#fff9c4" stopOpacity="0"/>
        </radialGradient>
        <style>
          {`
            .wing-right { animation: flap-right 1.2s ease-in-out infinite; transform-origin: 95px 85px; }
            .wing-left { animation: flap-left 1.2s ease-in-out infinite; transform-origin: 105px 85px; }
            @keyframes flap-right {
              0%, 100% { transform: rotate(-5deg); }
              50% { transform: rotate(8deg) translateY(-5px); }
            }
            @keyframes flap-left {
              0%, 100% { transform: rotate(5deg); }
              50% { transform: rotate(-8deg) translateY(-5px); }
            }
          `}
        </style>
      </defs>

      {/* Halo */}
      <ellipse cx="100" cy="58" rx="25" ry="7" fill="none" stroke="url(#halo-glow)" strokeWidth="3" transform="rotate(-10 100 58)"/>

      {/* Wings */}
      <g className="wing-left">
          <path d="M105 85 C 80 60, 50 80, 25 120 C 60 115, 90 110, 105 100 Z" fill="url(#wing)" stroke="#d0e0ff" strokeWidth="0.5"/>
          <path d="M105 85 C 80 65, 55 90, 35 130 C 70 125, 95 115, 105 105 Z" fill="url(#wing)" stroke="#d0e0ff" strokeWidth="0.5" style={{ filter: 'brightness(0.95)' }}/>
      </g>
      <g className="wing-right">
          <path d="M95 85 C 120 60, 150 80, 175 120 C 140 115, 110 110, 95 100 Z" fill="url(#wing)" stroke="#d0e0ff" strokeWidth="0.5"/>
          <path d="M95 85 C 120 65, 145 90, 165 130 C 130 125, 105 115, 95 105 Z" fill="url(#wing)" stroke="#d0e0ff" strokeWidth="0.5" style={{ filter: 'brightness(0.95)' }}/>
      </g>

      {/* Body */}
      <path d="M100 70 L90 150 L110 150 Z" fill="url(#robe)" />

      {/* Legs */}
      <path d="M95 150 C 93 160, 93 170, 95 175" stroke="url(#skin)" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M105 150 C 107 160, 107 170, 105 175" stroke="url(#skin)" strokeWidth="4" fill="none" strokeLinecap="round" />
      
      {/* Head */}
      <circle cx="100" cy="75" r="15" fill="url(#skin)" />
      
      {/* Face */}
      <circle cx="96" cy="73" r="1.2" fill="#5b3a2a" />
      <circle cx="104" cy="73" r="1.2" fill="#5b3a2a" />
      <path d="M98 78 Q 100 80, 102 78" stroke="#8b5b4a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M100 75 L 100 77" stroke="#b58a6f" strokeWidth="0.8" fill="none" strokeLinecap="round" />

       {/* Ears */}
      <path d="M85 73 C 82 70, 82 80, 85 77" fill="url(#skin)" stroke="#e6bca0" strokeWidth="0.5" />
      <path d="M115 73 C 118 70, 118 80, 115 77" fill="url(#skin)" stroke="#e6bca0" strokeWidth="0.5" />


      {/* Arms & Stick */}
      <g transform="translate(0, 5)">
        <path d="M90 90 C 80 100, 85 115, 100 110" stroke="url(#robe)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M110 90 C 120 100, 115 115, 100 110" stroke="url(#robe)" strokeWidth="8" fill="none" strokeLinecap="round" />
        
        {/* Hands */}
        <circle cx="100" cy="110" r="5" fill="url(#skin)" />
      </g>
      
       {/* Magic Stick */}
      <g transform="translate(100, 110) rotate(15)">
        <rect x="-1.5" y="-45" width="3" height="40" fill="#b58f4a" />
        <g transform="translate(0, -50)">
           <path d="M0 -10 L 3 -3 L 10 0 L 3 3 L 0 10 L -3 3 L -10 0 L -3 -3 Z" fill="#fff9c4" />
        </g>
      </g>
    </svg>
  );
}

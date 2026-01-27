
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AngelIcon } from './icons/angel-icon';
import { PotIcon } from './icons/pot-icon';
import { NishkaCoinIcon } from './icons/nishka-coin-icon';

// Config
const COIN_INTERVAL_MS = 1000;
const ANGEL_BOUND_PADDING = 40;
const ANGEL_MOVE_DURATION_MS = 4000;

// Helper: random number
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface CoinState {
  id: number;
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  startTime: number;
}

const Coin = React.memo(({ coin, onComplete }: { coin: CoinState, onComplete: (id: number) => void }) => {
  const coinRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const { startX, startY, destX, destY, startTime } = coin;
    const duration = 700 + Math.random() * 200;
    const cpX = (startX + destX) / 2 + (Math.random() - 0.5) * 120;
    const cpY = Math.min(startY, destY) - (120 + Math.random() * 80);

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const inv = 1 - t;
      const x = inv * inv * startX + 2 * inv * t * cpX + t * t * destX;
      const y = inv * inv * startY + 2 * inv * t * cpY + t * t * destY;
      const rot = t * 720;
      const scale = 1 - t * 0.35;

      if (coinRef.current) {
        coinRef.current.style.left = `${x}px`;
        coinRef.current.style.top = `${y}px`;
        coinRef.current.style.transform = `rotate(${rot}deg) scale(${scale})`;
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (coinRef.current) {
          coinRef.current.style.opacity = '0';
        }
        onComplete(coin.id);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [coin, onComplete]);

  return (
    <div ref={coinRef} className="coin">
      <NishkaCoinIcon />
    </div>
  );
});
Coin.displayName = 'Coin';


export function MiningAnimationV2() {
  const appRef = useRef<HTMLDivElement>(null);
  const angelRef = useRef<HTMLDivElement>(null);
  const potRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  const [coins, setCoins] = useState<CoinState[]>([]);
  const nextCoinId = useRef(0);

  // Angel Movement
  const scheduleNextAngelMove = useCallback(() => {
    if (!appRef.current || !angelRef.current) return;

    const rect = appRef.current.getBoundingClientRect();
    const padding = ANGEL_BOUND_PADDING;
    const minX = padding;
    const maxX = rect.width - padding - angelRef.current.clientWidth;
    const minY = padding;
    const maxY = rect.height / 2; // Keep angel in the top half

    const targetX = rand(minX, maxX);
    const targetY = rand(minY, maxY);

    if (targetX < angelRef.current.offsetLeft) {
      angelRef.current.style.transform = 'scaleX(-1)';
    } else {
      angelRef.current.style.transform = 'scaleX(1)';
    }

    const startX = angelRef.current.offsetLeft;
    const startY = angelRef.current.offsetTop;
    const duration = ANGEL_MOVE_DURATION_MS * (0.8 + Math.random() * 0.8);
    const startTime = performance.now();
    const wobbleAmplitude = 30 * (Math.random() * 0.6 + 0.6); // Calculate random amplitude once per move

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const cx = startX + (targetX - startX) * ease;
      const cy = startY + (targetY - startY) * ease + Math.sin(ease * Math.PI * 2) * wobbleAmplitude;

      if (angelRef.current) {
        angelRef.current.style.left = `${cx}px`;
        angelRef.current.style.top = `${cy}px`;
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        scheduleNextAngelMove();
      }
    };
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Coin Throwing
  const throwCoin = useCallback(() => {
    if (!angelRef.current || !potRef.current || !appRef.current) return;

    const angelRect = angelRef.current.getBoundingClientRect();
    const appRect = appRef.current.getBoundingClientRect();
    const potRect = potRef.current.getBoundingClientRect();
    
    const startX = angelRect.left + angelRect.width * 0.6 - appRect.left - 16;
    const startY = angelRect.top + angelRect.height * 0.6 - appRect.top - 16;
    
    const destX = potRect.left + potRect.width / 2 - appRect.left - 16;
    const destY = potRect.top + potRect.height / 2 - appRect.top - 16;
    
    setCoins(prevCoins => [...prevCoins, {
      id: nextCoinId.current++,
      startX, startY, destX, destY,
      startTime: performance.now(),
    }]);

    // Pot bounce animation
    if(potRef.current) {
      potRef.current.animate([
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-8px) scale(1.02)' },
          { transform: 'translateY(0) scale(1)' }
      ], { duration: 240, easing: 'ease-out' });
    }

  }, []);

  const handleCoinComplete = (id: number) => {
    setCoins(prev => prev.filter(c => c.id !== id));
  };

  useEffect(() => {
    scheduleNextAngelMove();
    const coinTimer = setInterval(throwCoin, COIN_INTERVAL_MS);

    return () => {
      clearInterval(coinTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [scheduleNextAngelMove, throwCoin]);

  return (
    <div ref={appRef} className="mining-animation-container">
      <div ref={angelRef} className="angel" style={{ left: '10%', top: '10%' }}>
        <AngelIcon />
      </div>
      <div ref={potRef} className="pot">
        <PotIcon />
      </div>
      <div className="pot-glow"></div>
      {coins.map(coin => (
        <Coin key={coin.id} coin={coin} onComplete={handleCoinComplete} />
      ))}
    </div>
  );
}


'use client';

import type { ReactNode } from 'react';
import { Pickaxe } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [clickCount, setClickCount] = useState(0);
  const router = useRouter();

  const handleSecretClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 5) {
      router.push('/auth/mobile-login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Glowing grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,150,0.1),transparent_70%)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,150,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,150,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>

      <div className="relative bg-black/40 backdrop-blur-xl border border-green-400/20 rounded-3xl p-10 w-[90%] max-w-md shadow-[0_0_40px_rgba(0,255,150,0.2)]">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Hire<span className="text-green-400">hills</span> Official Tok
          <span onClick={handleSecretClick} className="cursor-pointer">e</span>
          ns
        </h1>
        <p className="text-center text-gray-300 mb-8">
          Sign in or create an account to start mining HOT.
        </p>
        
        {children}

      </div>
    </div>
  );
}

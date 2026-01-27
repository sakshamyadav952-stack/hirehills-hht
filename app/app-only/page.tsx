
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';

const GooglePlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-8 w-8 mr-3">
        <path fill="#4CAF50" d="M315.8,256.3,52.2,463.1a32.3,32.3,0,0,0,29.3,26.4L315.8,256.3Z"/>
        <path fill="#2196F3" d="M52.2,48.9,315.8,256.3,52.2,463.1a32.3,32.3,0,0,1,0-57.8Z" transform="translate(0 -0.4)"/>
        <path fill="#FFC107" d="M485.7,219.1,348,256.3,485.7,293.4a32.3,32.3,0,0,0,0-74.3Z"/>
        <path fill="#F44336" d="M348,256.3,52.2,48.9a32.3,32.3,0,0,0,29.3-26.4L315.8,256.3Z"/>
    </svg>
);


export default function AppOnlyPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: 'linear-gradient(145deg, #0d0d1a, #1a1a2e)' }}>
            <div className="relative w-full max-w-md text-center text-white p-8 rounded-2xl border border-cyan-400/20 bg-black/30 backdrop-blur-xl shadow-[0_0_40px_rgba(0,255,255,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.15),transparent_70%)]"></div>
                
                <div className="inline-block p-4 mb-4 bg-cyan-400/10 border-2 border-cyan-400/20 rounded-full shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                    <Smartphone className="h-10 w-10 text-cyan-300" />
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-cyan-300" style={{ textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
                    Mobile App Required
                </h1>
                <p className="mt-4 text-lg text-cyan-100/80">
                    To access your account and start mining, please use the Blistree official mobile application.
                </p>

                {/* Download Button */}
                <div className="mt-8">
                    <Button
                        asChild
                        size="lg"
                        className="w-full h-16 bg-black text-white border-2 border-slate-600 hover:bg-slate-900 transition-all duration-300 transform hover:scale-105"
                    >
                        <Link href="https://play.google.com/store/apps/details?id=com.blistree.app" target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <GooglePlayIcon />
                            <div className="text-left">
                                <p className="text-xs uppercase">Get it on</p>
                                <p className="text-xl font-bold">Google Play</p>
                            </div>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

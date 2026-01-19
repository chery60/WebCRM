'use client';

import Image from 'next/image';

interface AuthMarketingPanelProps {
    variant?: 'signin' | 'signup';
}

export function AuthMarketingPanel({ variant = 'signin' }: AuthMarketingPanelProps) {
    return (
        <div className="relative hidden lg:flex flex-col justify-between bg-black text-white p-10 h-full overflow-hidden">
            {/* Decorative pattern - diagonal lines */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full">
                    {/* Diagonal lines pattern created with CSS */}
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="diagonalLines" patternUnits="userSpaceOnUse" width="100" height="100" patternTransform="rotate(45)">
                                <line x1="0" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" strokeDasharray="4 8" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diagonalLines)" />
                    </svg>
                </div>
            </div>

            {/* Main content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
                    Start closing more revenue<br />with Venture
                </h1>
                <p className="text-gray-400 text-sm mb-10">
                    Join Venture now to expand your revenue for future!
                </p>

                {/* App screenshot mockup */}
                <div className="relative w-full max-w-md mx-auto">
                    <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden transform perspective-1000 rotate-y-3">
                        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                            <div className="text-gray-400 text-sm">
                                {variant === 'signin' ? 'Tasks Preview' : 'Dashboard Preview'}
                            </div>
                        </div>
                    </div>
                    {/* Secondary floating card */}
                    <div className="absolute -bottom-4 -right-4 w-48 bg-white rounded-lg shadow-xl p-3 transform rotate-3">
                        <div className="h-20 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">Side panel</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner logos */}
            <div className="relative z-10 flex items-center justify-center gap-8 pt-8">
                <span className="text-gray-500 text-sm font-medium">coinbase</span>
                <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
                    <span>❖</span> Dropbox
                </span>
                <span className="text-gray-500 text-sm font-medium">Google</span>
                <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
                    <span>#</span> slack
                </span>
            </div>
        </div>
    );
}

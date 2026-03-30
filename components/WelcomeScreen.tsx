/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import { Sparkles } from 'lucide-react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        absolute top-24 left-0 w-full pointer-events-none flex justify-center z-10 select-none
        transition-all duration-700 ease-out transform font-sans
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
    `}>
      <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/40 shadow-sm">
        <Sparkles size={16} className="text-[#a1a43a]" />
        <span className="text-sm font-medium text-slate-700">
          Welcome to experience the magic of Voxels.
        </span>
      </div>
    </div>
  );
};

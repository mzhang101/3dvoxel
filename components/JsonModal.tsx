/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { X, FileJson, Copy, Check } from 'lucide-react';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: string;
}

export const JsonModal: React.FC<JsonModalProps> = ({ isOpen, onClose, data = '' }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
      if (isOpen) {
          setIsCopied(false);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
      if (!data) return;
      try {
          await navigator.clipboard.writeText(data);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy:', err);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col h-[70vh] animate-in fade-in zoom-in duration-200 scale-95 sm:scale-100 overflow-hidden">
        
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#f4f5d3] text-[#a1a43a]">
                <FileJson size={24} strokeWidth={2} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    Model Blueprint
                </h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">JSON Format</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-hidden bg-slate-50/50 flex flex-col relative">
          <textarea 
            readOnly
            value={data}
            className="w-full h-full resize-none bg-white border border-slate-200 rounded-2xl p-4 font-mono text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#d4d76a]/30 focus:border-[#d4d76a] transition-all"
          />
        </div>

        <div className="px-6 py-5 border-t border-slate-100 flex justify-end bg-white gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-slate-500 font-semibold hover:bg-slate-50 rounded-full transition-colors"
            >
                Close
            </button>
            <button
                onClick={handleCopy}
                className={`
                    flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full transition-all shadow-sm
                    ${isCopied 
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                        : 'bg-[#d4d76a] text-slate-900 hover:bg-[#c5c85a] shadow-[#d4d76a]/20'}
                `}
            >
                {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2} />}
                {isCopied ? 'Copied!' : 'Copy JSON'}
            </button>
        </div>

      </div>
    </div>
  );
};

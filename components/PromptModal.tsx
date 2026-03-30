/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onSubmit(prompt);
      setPrompt('');
      onClose();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in duration-200 scale-95 sm:scale-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            What should we build?
          </h2>
          <button 
            onClick={!isLoading ? onClose : undefined}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A futuristic spaceship, a cute cat, a medieval castle..."
              disabled={isLoading}
              className="w-full h-32 resize-none bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d4d76a]/30 focus:border-[#d4d76a] transition-all placeholder:text-slate-400 mb-6 text-lg"
              autoFocus
            />

            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-medium flex items-center gap-2">
                <X size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className={`
                  flex items-center gap-2 px-8 py-3.5 rounded-full font-bold transition-all
                  ${isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-wait' 
                    : 'bg-[#d4d76a] text-slate-900 hover:bg-[#c5c85a] shadow-md shadow-[#d4d76a]/20 active:scale-95'}
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

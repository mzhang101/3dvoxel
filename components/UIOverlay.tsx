/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { AppState, SavedModel } from '../types';
import { SOURCE_OPTIONS, getSelectionDisplay } from '../services/generators/catalog';
import { Box, Code2, Play, Pause, Info, Loader2, Sparkles, Layers, Upload, Save, Cpu, ArrowLeftRight } from 'lucide-react';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel?: string;
  customBuilds?: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  onLoadPreset?: (presetName: string) => void;
  onSelectCustomBuild?: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onShowJson: () => void;
  onImportModel: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
  onSavePreset: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  customPresetNames: string[];
  onToggleComparison?: () => void;
}

const LOADING_MESSAGES = [
    "Crafting voxels...",
    "Designing structure...",
    "Calculating physics...",
    "Mixing colors...",
    "Assembling geometry...",
    "Applying polish..."
];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  isAutoRotate,
  isInfoVisible,
  isGenerating,
  onLoadPreset,
  onPromptCreate,
  onShowJson,
  onImportModel,
  onToggleRotation,
  onToggleInfo,
  onSavePreset,
  selectedModel,
  onSelectModel,
  customPresetNames,
  onToggleComparison
}) => {
  const isStable = appState === AppState.STABLE;
    const selectedModelDisplay = getSelectionDisplay(selectedModel);
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [showModels, setShowModels] = useState(false);
    const [isGeminiExpanded, setIsGeminiExpanded] = useState(false);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    } else {
        setLoadingMsgIndex(0);
    }
  }, [isGenerating]);

    useEffect(() => {
        if (!showModels) {
            setIsGeminiExpanded(false);
            return;
        }

        if (selectedModelDisplay.primary === 'Gemini') {
            setIsGeminiExpanded(true);
        }
    }, [selectedModelDisplay.primary, showModels]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-sans">
      
      {/* --- Top Header --- */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
        
        {/* Logo & Stats */}
        <div className="flex items-center gap-4">
            <div className="bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-white/40 flex items-center gap-3">
                <div className="bg-[#d4d76a] text-slate-900 p-1.5 rounded-xl">
                    <Box size={20} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <span className="text-slate-800 font-black tracking-tight leading-none text-lg">VOXEL AI</span>
                    <span className="text-slate-500 font-medium text-[11px] uppercase tracking-widest mt-0.5">Generator</span>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm border border-white/40 flex items-center gap-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Count</span>
                <span className="text-slate-700 font-mono font-bold">{voxelCount}</span>
            </div>
        </div>

        {/* Utilities */}
        <div className="pointer-events-auto flex gap-2">
            <IconButton
                onClick={onToggleInfo}
                active={isInfoVisible}
                icon={<Info size={18} strokeWidth={2.5} />}
                label="Info"
            />
            <IconButton
                onClick={onToggleRotation}
                active={isAutoRotate}
                icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                label={isAutoRotate ? "Pause" : "Play"}
            />
            <IconButton
                onClick={onShowJson}
                icon={<Code2 size={18} strokeWidth={2.5} />}
                label="Code"
            />
            <IconButton
                onClick={onImportModel}
                icon={<Upload size={18} strokeWidth={2.5} />}
                label="Import"
            />
            <IconButton
                onClick={onSavePreset}
                icon={<Save size={18} strokeWidth={2.5} />}
                label="Save Preset"
            />
            {onToggleComparison && (
            <IconButton
                onClick={onToggleComparison}
                icon={<ArrowLeftRight size={18} strokeWidth={2.5} />}
                label="Compare"
            />
            )}
        </div>
      </div>

      {/* --- Loading Indicator --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-xl border border-white/40 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <div className="relative">
                      <div className="absolute inset-0 bg-[#d4d76a] rounded-full animate-ping opacity-30"></div>
                      <Loader2 size={40} className="text-[#a1a43a] animate-spin" />
                  </div>
                  <div className="text-center">
                      <h3 className="text-lg font-bold text-slate-800">Generating...</h3>
                      <p className="text-slate-500 font-medium text-sm transition-all duration-300">
                          {LOADING_MESSAGES[loadingMsgIndex]}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* --- Bottom Action --- */}
      <div className="absolute bottom-10 left-0 w-full flex justify-center items-end pointer-events-none">
        <div className="pointer-events-auto transition-all duration-500 ease-in-out transform flex flex-col items-center gap-4">
            {isStable && !isGenerating && (
                 <div className="animate-in slide-in-from-bottom-8 fade-in duration-500 flex items-center gap-4">
                     
                     <div className="relative">
                         <button 
                            onClick={() => setShowModels(!showModels)}
                            className="group relative flex items-center gap-2 bg-white/80 hover:bg-white text-slate-700 px-6 py-4 rounded-full shadow-lg shadow-black/5 transition-all active:scale-95 border border-white/40"
                         >
                            <Cpu size={20} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="font-bold tracking-wide text-lg capitalize">{selectedModelDisplay.primary}</span>
                                {selectedModelDisplay.secondary && (
                                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{selectedModelDisplay.secondary}</span>
                                )}
                            </div>
                         </button>

                         {showModels && (
                             <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white/40 p-2 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[240px] animate-in fade-in slide-in-from-bottom-2">
                                 {SOURCE_OPTIONS.map((option) => {
                                     const isGeminiGroup = option.key === 'gemini';
                                     const isActive = isGeminiGroup ? selectedModelDisplay.primary === 'Gemini' : selectedModel === option.key;

                                     return (
                                         <div key={option.key} className="flex flex-col gap-1">
                                             <button
                                                onClick={() => {
                                                    if (!option.enabled) return;
                                                    if (option.children) {
                                                        setIsGeminiExpanded((prev) => !prev);
                                                        return;
                                                    }
                                                    setShowModels(false);
                                                    onSelectModel(option.key);
                                                }}
                                                disabled={!option.enabled}
                                                className={`text-left px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-between ${isActive ? 'text-[#a1a43a] bg-[#f4f5d3]' : option.enabled ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'}`}
                                             >
                                                 <span>{option.label}</span>
                                                 {option.children ? (
                                                    <span className={`text-xs transition-transform ${isGeminiExpanded ? 'rotate-90' : ''}`}>›</span>
                                                 ) : !option.enabled ? (
                                                    <span className="text-[10px] font-black uppercase tracking-wide">Soon</span>
                                                 ) : null}
                                             </button>

                                             {option.children && isGeminiExpanded && (
                                                <div className="ml-3 rounded-xl border border-slate-100 bg-slate-50/80 p-1.5">
                                                    {option.children.map((child) => {
                                                        const childActive = selectedModel === child.key;

                                                        return (
                                                            <button
                                                                key={child.key}
                                                                onClick={() => {
                                                                    if (!child.enabled) return;
                                                                    setShowModels(false);
                                                                    onSelectModel(child.key);
                                                                }}
                                                                disabled={!child.enabled}
                                                                className={`mt-1 first:mt-0 w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${childActive ? 'bg-white text-[#8e9234] shadow-sm ring-1 ring-[#d4d76a]/40' : child.enabled ? 'text-slate-600 hover:bg-white hover:text-slate-800' : 'text-slate-300 cursor-not-allowed'}`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span>{child.label}</span>
                                                                    {!child.enabled && <span className="text-[10px] font-black uppercase tracking-wide">Soon</span>}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                         )}
                     </div>

                     <div className="relative">
                         <button 
                            onClick={() => setShowPresets(!showPresets)}
                            className="group relative flex items-center gap-2 bg-white/80 hover:bg-white text-slate-700 px-6 py-4 rounded-full shadow-lg shadow-black/5 transition-all active:scale-95 border border-white/40"
                         >
                            <Layers size={20} className="text-slate-500 group-hover:text-slate-700 transition-colors" />
                            <span className="font-bold tracking-wide text-lg">Presets</span>
                         </button>

                         {showPresets && (
                             <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-white/40 p-2 rounded-2xl shadow-xl flex flex-col gap-1 min-w-[160px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
                                 {['ModernSofa', 'ModernLamp', 'Table', ...customPresetNames].map(preset => (
                                     <button
                                        key={preset}
                                        onClick={() => {
                                            setShowPresets(false);
                                            onLoadPreset?.(preset);
                                        }}
                                        className="text-left px-4 py-3 rounded-xl hover:bg-slate-100 text-slate-700 font-medium transition-colors whitespace-nowrap"
                                     >
                                         {preset === 'ModernSofa' ? 'Modern Sofa' : preset === 'ModernLamp' ? 'Modern Lamp' : preset}
                                     </button>
                                 ))}
                             </div>
                         )}
                     </div>

                     <button 
                        onClick={onPromptCreate}
                        className="group relative flex items-center gap-3 bg-[#d4d76a] hover:bg-[#c5c85a] text-slate-900 px-8 py-4 rounded-full shadow-lg shadow-[#d4d76a]/30 transition-all active:scale-95 border border-[#d4d76a]/50"
                     >
                        <Sparkles size={20} className="text-slate-700 group-hover:text-slate-900 transition-colors" />
                        <span className="font-bold tracking-wide text-lg">Generate Model</span>
                     </button>
                 </div>
            )}
        </div>
      </div>

    </div>
  );
};

// --- Components ---

interface IconButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({ onClick, icon, label, active }) => {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 shadow-sm border
        ${active 
            ? 'bg-[#f4f5d3] text-[#a1a43a] border-[#d4d76a]/50' 
            : 'bg-white/80 backdrop-blur-md text-slate-600 border-white/40 hover:bg-white hover:text-[#a1a43a] hover:shadow-md'}
      `}
    >
      {icon}
    </button>
  );
};

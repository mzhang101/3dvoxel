/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ComparisonView } from './components/ComparisonView';
import { Generators } from './utils/voxelGenerators';
import { parseImportedModel } from './utils/modelImport';
import { getGenerator } from './services/generators';
import { GEMINI_MODEL_OPTIONS } from './services/generators/catalog';
import { evaluateAll } from './utils/voxelEvaluator';
import { appendRecord } from './components/EvalHistory';
import { AppState, VoxelData, SavedModel, GenerationRecord } from './types';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [savedApiKey, setSavedApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('gemini_api_key') ?? '';
  });

  const [selectedModel, setSelectedModel] = useState<string>(GEMINI_MODEL_OPTIONS[0].key);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [customPresets, setCustomPresets] = useState<SavedModel[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(window.localStorage.getItem('custom_voxel_presets') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Engine
    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => setVoxelCount(count)
    );

    engineRef.current = engine;

    // Initial Model Load
    engine.loadInitialModel(Generators.ModernSofa());

    // Resize Listener
    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);

    // Auto-hide welcome screen after interaction (optional, but sticking to simple toggle for now)
    // For now, just auto-hide after 5s or user dismiss
    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  const handleShowJson = () => {
    if (engineRef.current) {
      setJsonData(engineRef.current.getJsonData());
      setIsJsonModalOpen(true);
    }
  };

  const openPrompt = () => {
      setIsPromptModalOpen(true);
  }
  
  const handleToggleRotation = () => {
      const newState = !isAutoRotate;
      setIsAutoRotate(newState);
      if (engineRef.current) {
          engineRef.current.setAutoRotate(newState);
      }
  }

  const handleLoadPreset = (presetName: string) => {
      if (engineRef.current) {
          let data: VoxelData[] = [];
          switch (presetName) {
              case 'ModernSofa':
                  data = Generators.ModernSofa();
                  break;
              case 'ModernLamp':
                  data = Generators.ModernLamp();
                  break;
              case 'Table':
                  data = Generators.Table();
                  break;
              default:
                  const custom = customPresets.find(p => p.name === presetName);
                  data = custom ? custom.data : Generators.ModernSofa();
          }
          engineRef.current.generateEffect(data);
      }
  };

  const handleSavePreset = () => {
    if (engineRef.current) {
      try {
        const dataStr = engineRef.current.getJsonData();
        const parsed = JSON.parse(dataStr);
        const voxelData: VoxelData[] = parsed.map((p: any) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
          z: Math.round(p.z),
          color: parseInt(p.c.replace('#', ''), 16)
        }));
        
        const presetName = prompt("Enter a name for this preset:", `Preset ${customPresets.length + 1}`);
        if (!presetName) return;
        
        const newPreset: SavedModel = { name: presetName, data: voxelData };
        const updatedPresets = [...customPresets, newPreset];
        setCustomPresets(updatedPresets);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('custom_voxel_presets', JSON.stringify(updatedPresets));
        }
        alert("Saved to presets successfully!");
      } catch (err) {
        console.error("Failed to save preset:", err);
        alert("Failed to save preset.");
      }
    }
  };

  const handleOpenImportPicker = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const text = await file.text();
      const voxels = parseImportedModel(text);

      if (engineRef.current) {
        engineRef.current.generateEffect(voxels);
      }
    } catch (err) {
      console.error('Import failed', err);
      const message = err instanceof Error ? err.message : 'Unknown import error';
      alert(`Import failed: ${message}`);
    }
  };

  const handlePromptSubmit = async (prompt: string, apiKeyInput?: string) => {
    const runtimeKey = (apiKeyInput ?? '').trim() || savedApiKey;
    if (!runtimeKey) {
      throw new Error('Missing API key. Paste your Gemini API key in the modal.');
    }

    if (runtimeKey !== savedApiKey) {
      setSavedApiKey(runtimeKey);
      window.localStorage.setItem('gemini_api_key', runtimeKey);
    }

    // Close the modal immediately and show progress on the main scene.
    setIsPromptModalOpen(false);
    setIsGenerating(true);

    const start = performance.now();

    try {
        const gen = getGenerator(selectedModel);
        const voxelData = await gen.generate(prompt, runtimeKey);
        const elapsed = Math.round(performance.now() - start);

        if (engineRef.current) {
            engineRef.current.generateEffect(voxelData);
        }

        // Evaluate and persist
        const evaluation = evaluateAll(voxelData);
        const record: GenerationRecord = {
          id: crypto.randomUUID(),
          prompt,
          model: selectedModel,
          timestamp: Date.now(),
          generationTimeMs: elapsed,
          voxelData,
          evaluation,
        };
        appendRecord(record);
    } catch (err) {
        console.error("Generation failed", err);
          const message = err instanceof Error ? err.message : 'Generation failed.';
          alert(`Generation failed: ${message}`);
    } finally {
        setIsGenerating(false);
    }
  };

  // ---- Comparison mode ----
  if (comparisonMode) {
    return (
      <ComparisonView
        savedApiKey={savedApiKey}
        leftModel={selectedModel}
        rightModel="mock"
        onExit={() => setComparisonMode(false)}
      />
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      {/* 3D Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      {/* UI Overlay */}
      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        onLoadPreset={handleLoadPreset}
        onPromptCreate={() => openPrompt()}
        onShowJson={handleShowJson}
        onImportModel={handleOpenImportPicker}
        onToggleRotation={handleToggleRotation}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
        onSavePreset={handleSavePreset}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        customPresetNames={customPresets.map(p => p.name)}
        onToggleComparison={() => setComparisonMode(true)}
      />

      <input
        ref={importInputRef}
        type="file"
        accept=".json,.txt"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Modals & Screens */}
      
      <WelcomeScreen visible={showWelcome} />

      <JsonModal 
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        data={jsonData}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        savedApiKey={savedApiKey}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};

export default App;

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
import { Generators } from './utils/voxelGenerators';
import { parseImportedModel } from './utils/modelImport';
import { AppState, VoxelData } from './types';
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
                  data = Generators.ModernSofa();
          }
          engineRef.current.generateEffect(data);
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

    setIsGenerating(true);

    try {
        const ai = new GoogleGenAI({ apiKey: runtimeKey });
      const model = 'gemini-2.5-flash';
        
        let systemContext = `
            CONTEXT: You are creating a brand new voxel art scene from scratch.
            Be creative with colors.
        `;

        const response = await ai.models.generateContent({
            model,
            contents: `
                    ${systemContext}
                    
                    Task: Generate a 3D voxel art model of: "${prompt}".
                    
                    Strict Rules:
                    1. Use approximately 150 to 600 voxels.
                    2. The model must be centered at x=0, z=0.
                    3. The bottom of the model must be at y=0 or slightly higher.
                    4. Ensure the structure is physically plausible (connected).
                    5. Coordinates should be integers.
                    
                    Return ONLY a JSON array of objects.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            x: { type: Type.INTEGER },
                            y: { type: Type.INTEGER },
                            z: { type: Type.INTEGER },
                            color: { type: Type.STRING, description: "Hex color code e.g. #FF5500" }
                        },
                        required: ["x", "y", "z", "color"]
                    }
                }
            }
        });

        if (response.text) {
            const rawData = JSON.parse(response.text);
            
            // Validate and transform to VoxelData
            const voxelData: VoxelData[] = rawData.map((v: any) => {
                let colorStr = v.color;
                if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                const colorInt = parseInt(colorStr, 16);
                
                return {
                    x: v.x,
                    y: v.y,
                    z: v.z,
                    color: isNaN(colorInt) ? 0xCCCCCC : colorInt
                };
            });

            if (engineRef.current) {
                engineRef.current.generateEffect(voxelData);
            }

            setIsPromptModalOpen(false);
          } else {
            throw new Error('Model returned an empty response.');
        }
    } catch (err) {
        console.error("Generation failed", err);
          const message = err instanceof Error ? err.message : 'Generation failed.';
          throw new Error(`Generation failed: ${message}`);
    } finally {
        setIsGenerating(false);
    }
  };

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

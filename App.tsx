/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ComparisonView } from './components/ComparisonView';
import { Generators } from './utils/voxelGenerators';
import { parseImportedModel, voxelsToBricks, parseBrickPieces } from './utils/modelImport';
import { getGenerator } from './services/generators';
import {
  GEMINI_MODEL_OPTIONS,
  isGeminiModelSelection,
  modelPickerSourceOptions,
} from './services/generators/catalog';
import { evaluateAll } from './utils/voxelEvaluator';
import { evaluateConstraints, parseBrickData, BrickData } from './utils/constraintEvaluator';
import { appendRecord } from './components/EvalHistory';
import { AppState, VoxelData, SavedModel, GenerationRecord } from './types';
import type { ConstraintReport } from './utils/constraintEvaluator';
import { useT } from './i18n/LocaleContext';
import { LanguageToggle } from './components/LanguageToggle';
import { ModelSourceSettings } from './components/ModelSourceSettings';
import type { SourceInfo } from './components/UIOverlay';
import { providerOf, readSavedKey, writeSavedKey, missingKeyAlertKey, type Provider } from './services/generators/keys';
import type { GenerationProgress } from './services/generators';
import { ColorPanel } from './components/ColorPanel';
import { suggestColors } from './services/llmColor';
import type { BrickPiece } from './types';
const MODEL_PICKER_SCOPE_KEY = 'voxel_model_picker_google_only';

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
  const [jsonBrickText, setJsonBrickText] = useState<string | undefined>(undefined);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [savedApiKeys, setSavedApiKeys] = useState<Record<Provider, string>>(() => ({
    gemini: readSavedKey('gemini'),
    deepseek: readSavedKey('deepseek'),
    mock: '',
  }));

  const setSavedApiKey = (provider: Provider, value: string) => {
    setSavedApiKeys(prev => ({ ...prev, [provider]: value }));
    writeSavedKey(provider, value);
  };

  const [selectedModel, setSelectedModel] = useState<string>(GEMINI_MODEL_OPTIONS[0].key);
  const [modelPickerGoogleOnly, setModelPickerGoogleOnly] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MODEL_PICKER_SCOPE_KEY) === '1';
  });
  const [comparisonMode, setComparisonMode] = useState(false);
  const [constraintReport, setConstraintReport] = useState<ConstraintReport | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo>({ key: 'app.source.preset.modern_sofa' });
  const [overlapHighlightActive, setOverlapHighlightActive] = useState(false);
  const [genProgress, setGenProgress] = useState<GenerationProgress | null>(null);
  const [currentBricks, setCurrentBricks] = useState<BrickPiece[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [manualPaintMode, setManualPaintMode] = useState(false);
  const [manualPaintColor, setManualPaintColor] = useState('#74c69d');
  const [aiColorPending, setAiColorPending] = useState(false);
  const t = useT();

  const modelSourceOptions = useMemo(
    () => modelPickerSourceOptions(modelPickerGoogleOnly),
    [modelPickerGoogleOnly],
  );

  const persistModelPickerGoogleOnly = (value: boolean) => {
    setModelPickerGoogleOnly(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODEL_PICKER_SCOPE_KEY, value ? '1' : '0');
    }
  };

  useEffect(() => {
    if (!modelPickerGoogleOnly) return;
    if (!isGeminiModelSelection(selectedModel)) {
      setSelectedModel(GEMINI_MODEL_OPTIONS[0].key);
    }
  }, [modelPickerGoogleOnly, selectedModel]);

  // ----- Coloring handlers (H) -----

  const handleUniformColor = (hex: string) => {
    if (!engineRef.current) return;
    const intColor = parseInt(hex.replace('#', ''), 16);
    for (const b of currentBricks) {
      engineRef.current.setBrickColor(b.id, intColor);
    }
  };

  const handleAiColor = async () => {
    if (currentBricks.length === 0) return;
    const provider = providerOf(selectedModel);
    const aiProvider: 'gemini' | 'deepseek' = provider === 'deepseek' ? 'deepseek' : 'gemini';
    const key = savedApiKeys[aiProvider] ?? '';
    if (!key) {
      alert(t('color.ai.no_key', { provider: aiProvider }));
      return;
    }
    setAiColorPending(true);
    try {
      const colors = await suggestColors(currentPrompt, currentBricks, key, aiProvider);
      if (engineRef.current) {
        for (const b of currentBricks) {
          const hex = colors[b.id];
          if (hex) {
            const intColor = parseInt(hex.replace('#', ''), 16);
            engineRef.current.setBrickColor(b.id, intColor);
          }
        }
      }
    } catch (err) {
      alert(t('color.ai.failed', { message: err instanceof Error ? err.message : String(err) }));
    } finally {
      setAiColorPending(false);
    }
  };

  const handleResetColor = () => {
    if (engineRef.current) {
      engineRef.current.clearBrickColorOverrides();
    }
  };

  const handleSaveColoredPreset = () => {
    if (!engineRef.current || currentBricks.length === 0) return;
    try {
      const dataStr = engineRef.current.getJsonData();
      const parsed = JSON.parse(dataStr);
      const voxelData: VoxelData[] = parsed.map((p: any) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
        z: Math.round(p.z),
        color: parseInt(p.c.replace('#', ''), 16),
      }));
      const presetName = prompt(
        t('app.alert.preset_name_prompt'),
        t('app.alert.preset_default_name', { n: customPresets.length + 1 }),
      );
      if (!presetName) return;
      const newPreset: SavedModel = { name: presetName, data: voxelData };
      const updated = [...customPresets, newPreset];
      setCustomPresets(updated);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('custom_voxel_presets', JSON.stringify(updated));
      }
      alert(t('app.alert.preset_saved'));
    } catch (err) {
      console.error('Save colored preset failed', err);
      alert(t('app.alert.preset_save_failed'));
    }
  };

  // Hold the current paint color in a ref so changing it doesn't re-run the
  // listener-setup effect (which would re-attach/detach on every pixel of the
  // color picker drag — a major lag source).
  const manualPaintColorRef = useRef(manualPaintColor);
  useEffect(() => { manualPaintColorRef.current = manualPaintColor; }, [manualPaintColor]);
  const autoRotateRef = useRef(isAutoRotate);
  useEffect(() => { autoRotateRef.current = isAutoRotate; }, [isAutoRotate]);

  // Click-to-paint: attach listeners on the canvas in the capture phase so we
  // run BEFORE OrbitControls' pointerdown handler (it sets pointer capture and
  // can otherwise swallow the event). We also disable controls while painting
  // so the camera stays put and the click distinguishes cleanly from a drag.
  useEffect(() => {
    if (!engineRef.current) return;
    if (!manualPaintMode) {
      engineRef.current.setControlsEnabled(true);
      return;
    }
    const wasAutoRotate = autoRotateRef.current;
    engineRef.current.setControlsEnabled(false);

    const canvas = engineRef.current.getDomElement();
    let downX = 0;
    let downY = 0;
    let downAt = 0;
    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
      downAt = performance.now();
    };
    const onUp = (ev: PointerEvent) => {
      if (!engineRef.current) return;
      // Treat as a click only if the cursor barely moved and the gesture is short.
      const moved = Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY);
      if (moved > 8 || performance.now() - downAt > 800) return;
      const brickId = engineRef.current.pickBrickAt(ev.clientX, ev.clientY);
      if (brickId) {
        const intColor = parseInt(manualPaintColorRef.current.replace('#', ''), 16);
        engineRef.current.setBrickColor(brickId, intColor);
      }
    };
    canvas.addEventListener('pointerdown', onDown, { capture: true });
    canvas.addEventListener('pointerup', onUp, { capture: true });
    return () => {
      canvas.removeEventListener('pointerdown', onDown, { capture: true } as EventListenerOptions);
      canvas.removeEventListener('pointerup', onUp, { capture: true } as EventListenerOptions);
      if (engineRef.current) {
        engineRef.current.setControlsEnabled(true);
        if (wasAutoRotate) engineRef.current.setAutoRotate(true);
      }
    };
  }, [manualPaintMode]);

  const handleHighlightOverlaps = (brickIds: string[]) => {
    if (!engineRef.current) return;
    if (overlapHighlightActive) {
      engineRef.current.clearHighlightedBricks();
      setOverlapHighlightActive(false);
    } else {
      engineRef.current.setHighlightedBricks(brickIds);
      setOverlapHighlightActive(true);
    }
  };
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

    // Initial Model Load — wrap voxels as 1×1 bricks so the LEGO renderer
    // (with studs + per-brick coloring) applies to presets too.
    const initialVoxels = Generators.ModernSofa();
    const initialBricks = voxelsToBricks(initialVoxels);
    engine.loadBrickModel(initialBricks);
    setCurrentBricks(initialBricks);
    setCurrentPrompt('Modern Sofa');
    setConstraintReport(evaluateConstraints(initialVoxels));
    setSourceInfo({ key: 'app.source.preset.modern_sofa' });

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
      setJsonBrickText(engineRef.current.hasBricks() ? engineRef.current.getBrickText() : undefined);
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
          let sourceKey = 'app.source.preset';
          let sourceParams: Record<string, string | number> | undefined = { name: presetName };
          switch (presetName) {
              case 'ModernSofa':
                  data = Generators.ModernSofa();
                  sourceKey = 'app.source.preset.modern_sofa';
                  sourceParams = undefined;
                  break;
              case 'ModernLamp':
                  data = Generators.ModernLamp();
                  sourceKey = 'app.source.preset.modern_lamp';
                  sourceParams = undefined;
                  break;
              case 'Table':
                  data = Generators.Table();
                  sourceKey = 'app.source.preset.table';
                  sourceParams = undefined;
                  break;
              default:
                  const custom = customPresets.find(p => p.name === presetName);
                  data = custom ? custom.data : Generators.ModernSofa();
          }
          const bricks = voxelsToBricks(data);
          engineRef.current.generateBrickEffect(bricks);
          setCurrentBricks(bricks);
          setCurrentPrompt(presetName);
          setConstraintReport(evaluateConstraints(data));
          setSourceInfo({ key: sourceKey, params: sourceParams });
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
        
        const presetName = prompt(
          t('app.alert.preset_name_prompt'),
          t('app.alert.preset_default_name', { n: customPresets.length + 1 }),
        );
        if (!presetName) return;

        const newPreset: SavedModel = { name: presetName, data: voxelData };
        const updatedPresets = [...customPresets, newPreset];
        setCustomPresets(updatedPresets);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('custom_voxel_presets', JSON.stringify(updatedPresets));
        }
        alert(t('app.alert.preset_saved'));
      } catch (err) {
        console.error("Failed to save preset:", err);
        alert(t('app.alert.preset_save_failed'));
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

      let bricks: BrickData[] | undefined;
      let brickText: string | undefined;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.bricks === 'string') {
            brickText = parsed.bricks;
            bricks = parseBrickData(parsed.bricks);
          } else if (typeof parsed.model_3d_bricks === 'string') {
            brickText = parsed.model_3d_bricks;
            bricks = parseBrickData(parsed.model_3d_bricks);
          }
        }
      } catch {
        const inferred = parseBrickData(text);
        if (inferred.length > 0) {
          brickText = text;
          bricks = inferred;
        }
      }
      if (bricks && bricks.length === 0) {
        bricks = undefined;
        brickText = undefined;
      }

      if (engineRef.current) {
        let bricksToRender: BrickPiece[] | null = null;
        if (brickText) {
          const parsed = parseBrickPieces(brickText);
          if (parsed.length > 0) bricksToRender = parsed;
        }
        if (!bricksToRender) bricksToRender = voxelsToBricks(voxels);
        engineRef.current.generateBrickEffect(bricksToRender);
        setCurrentBricks(bricksToRender);
        setCurrentPrompt(file.name);
      }

      setConstraintReport(evaluateConstraints(voxels, bricks));
      setSourceInfo({ key: 'app.source.imported', params: { file: file.name } });
    } catch (err) {
      console.error('Import failed', err);
      const message = err instanceof Error ? err.message : 'Unknown import error';
      alert(t('app.alert.import_failed', { message }));
    }
  };

  const handlePromptSubmit = async (prompt: string, apiKeyInput?: string) => {
    const provider = providerOf(selectedModel);
    const stored = savedApiKeys[provider] ?? '';
    const runtimeKey = (apiKeyInput ?? '').trim() || stored;
    if (provider !== 'mock' && !runtimeKey) {
      throw new Error(t(missingKeyAlertKey(provider)));
    }

    if (runtimeKey && runtimeKey !== stored) {
      setSavedApiKey(provider, runtimeKey);
    }

    // Close the modal immediately and show progress on the main scene.
    setIsPromptModalOpen(false);
    setIsGenerating(true);
    setGenProgress(null);

    const start = performance.now();

    try {
        const gen = getGenerator(selectedModel);
        const voxelData = await gen.generate(prompt, runtimeKey, {
          onProgress: (p) => setGenProgress(p),
        });
        const elapsed = Math.round(performance.now() - start);

        if (engineRef.current) {
            const bricks = gen.lastBricks && gen.lastBricks.length > 0
              ? gen.lastBricks
              : voxelsToBricks(voxelData);
            engineRef.current.generateBrickEffect(bricks);
            setCurrentBricks(bricks);
        }
        setCurrentPrompt(prompt);

        // Evaluate and persist
        const evaluation = evaluateAll(voxelData);
        const brickText = gen.lastBrickText ?? undefined;
        const bricks = brickText ? parseBrickData(brickText) : undefined;
        const constraints = evaluateConstraints(
          voxelData,
          bricks && bricks.length > 0 ? bricks : undefined,
        );
        setConstraintReport(constraints);
        const sourceKey = provider === 'deepseek'
          ? 'app.source.deepseek'
          : provider === 'gemini'
            ? 'app.source.gemini'
            : 'app.source.mock';
        setSourceInfo({ key: sourceKey, params: provider === 'mock' ? undefined : { model: selectedModel } });
        const record: GenerationRecord = {
          id: crypto.randomUUID(),
          prompt,
          model: selectedModel,
          timestamp: Date.now(),
          generationTimeMs: elapsed,
          voxelData,
          evaluation,
          constraintReport: constraints,
          sourceBricks: brickText,
        };
        appendRecord(record);
    } catch (err) {
        console.error("Generation failed", err);
          const message = err instanceof Error ? err.message : 'Generation failed.';
          alert(t('app.alert.generation_failed', { message }));
    } finally {
        setIsGenerating(false);
        setGenProgress(null);
    }
  };

  // ---- Comparison mode ----
  if (comparisonMode) {
    return (
      <>
        <ComparisonView
          savedApiKeys={savedApiKeys}
          onSaveApiKey={setSavedApiKey}
          leftModel={selectedModel}
          rightModel="mock"
          modelPickerGoogleOnly={modelPickerGoogleOnly}
          onExit={() => setComparisonMode(false)}
        />
        <ModelSourceSettings
          googleOnly={modelPickerGoogleOnly}
          onGoogleOnlyChange={persistModelPickerGoogleOnly}
        />
        <LanguageToggle />
      </>
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
        modelSourceOptions={modelSourceOptions}
        customPresetNames={customPresets.map(p => p.name)}
        onToggleComparison={() => setComparisonMode(true)}
        constraintReport={constraintReport}
        sourceInfo={sourceInfo}
        onHighlightOverlaps={handleHighlightOverlaps}
        highlightActive={overlapHighlightActive}
        genProgress={genProgress}
        onToggleColor={() => setColorPanelOpen((v) => !v)}
        hasBricks={currentBricks.length > 0}
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
        brickText={jsonBrickText}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        provider={providerOf(selectedModel)}
        savedApiKey={savedApiKeys[providerOf(selectedModel)] ?? ''}
        onSubmit={handlePromptSubmit}
      />

      <ColorPanel
        open={colorPanelOpen}
        onClose={() => setColorPanelOpen(false)}
        bricks={currentBricks}
        modelPrompt={currentPrompt}
        onUniformColor={handleUniformColor}
        onAiColor={handleAiColor}
        manualMode={manualPaintMode}
        onSetManualMode={setManualPaintMode}
        manualColor={manualPaintColor}
        onSetManualColor={setManualPaintColor}
        onReset={handleResetColor}
        onSave={handleSaveColoredPreset}
        aiPending={aiColorPending}
      />

      <ModelSourceSettings
        googleOnly={modelPickerGoogleOnly}
        onGoogleOnlyChange={persistModelPickerGoogleOnly}
      />
      <LanguageToggle />
    </div>
  );
};

export default App;

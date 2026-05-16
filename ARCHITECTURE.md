# Voxel Architect — 项目架构与功能文档

> HKUST(GZ) UGOD6001 "AI for 3D Design" 期末项目 **Geo3D / Physically Stable 3D Voxel Assets Generation via LLM** 的前端展示与评估系统。本文档反映本仓库当前的代码状态，覆盖：功能清单、目录结构、关键模块、数据流、外部依赖、约束评估算法和已知限制。

---

## 1 · 项目目标

通过浏览器端的 3D 体素查看器对比 **GRPO 训练出的 LEGO 砖块生成模型** 与 **通用 LLM（Gemini / DeepSeek）** 的零样本输出，并在前端运行 GRPO 训练奖励里的硬约束（砖块库合规、无碰撞、包围盒、结构稳定性、拓扑完整性），生成 demo-quality 的可视化和量化对比。

四条核心评分维度（对应课程评分）：

- **Constraint** —— 是否严格遵循领域硬约束（前端 ConstraintPanel + Validity Score）。
- **Metrics** —— 是否定义并使用量化指标（MetricsPanel）。
- **Comparison** —— 是否与 SOTA / 传统工作流做基准对比（ComparisonView + Geo3D GRPO Benchmark Loader）。
- **Use Case** —— 是否通过具体场景验证（GRPO 测试集 254 条 prompt 全量可加载）。

---

## 2 · 技术栈

| | |
|---|---|
| 构建工具 | Vite 6 |
| 语言 | TypeScript 5.8（strict） |
| UI | React 19 + Tailwind CSS（CDN） + lucide-react 图标 |
| 3D 渲染 | Three.js 0.181 + OrbitControls + BufferGeometryUtils |
| LLM SDK | `@google/genai`（Gemini）；DeepSeek 走 OpenAI-兼容 REST |
| 测试 | `node:test`（轻量） |
| 部署 | GitHub Pages，`base: '/3dvoxel/'` |

部署目录：`https://mzhang101.github.io/3dvoxel/`；本地开发 `npm run dev`（端口 3000）；构建 `npm run build`；测试 `npx node --test tests/`。

---

## 3 · 目录结构

```
voxel-asset-0315/
├── index.tsx, App.tsx                     # 入口 / 顶层路由（普通模式 vs 对比模式）
├── types.ts                                # 全局类型（VoxelData / BrickPiece / BrickInstance / GenerationRecord 等）
├── vite-env.d.ts                           # ?url / three/addons ambient declarations
│
├── components/                             # React UI
│   ├── UIOverlay.tsx                       # 顶部工具栏、底部模型选择 / 预设 / 生成、Loading 浮层
│   ├── WelcomeScreen.tsx                   # 首屏 LEGO 动画 + "开始" 按钮（Three.js）
│   ├── PromptModal.tsx                     # 输入框 + 按 provider 切换 API key 输入
│   ├── JsonModal.tsx                       # Brick Lines / Voxel JSON 切换 + 复制
│   ├── ConstraintPanel.tsx                 # 约束面板：动画检测 + 重叠高亮 👁 + 落砖测试
│   ├── MetricsPanel.tsx                    # 数值指标 + LLM Judge 雷达图
│   ├── ColorPanel.tsx                      # 着色面板：AI / 调色板 / 手动 / 重置 / 保存
│   ├── BenchmarkPicker.tsx                 # 254 条 GRPO prompt 列表 + 加载
│   ├── ComparisonView.tsx                  # 对比模式：双视口 + 双 ConstraintPanel + 着色 + 流式进度
│   ├── EvalHistory.tsx                     # 历史记录侧栏 + JSON/CSV 导出
│   ├── ModelSourceSettings.tsx             # 设置面板：Google-only / All vendors
│   └── LanguageToggle.tsx                  # 右下角语言切换 EN / 中
│
├── services/
│   ├── VoxelEngine.ts                      # Three.js 引擎：voxel 模式 + 砖块模式
│   ├── brickMeshLibrary.ts                 # 14 种砖型预生成 mesh（带 LEGO 凸点）
│   ├── llmJudge.ts                         # Gemini 评分（4 维 0-10）
│   ├── llmColor.ts                         # AI 着色：发送 brick 布局 → 颜色映射
│   ├── geminiModelFallback.ts              # Gemini 模型容错 fallback
│   └── generators/
│       ├── index.ts                        # GeneratorAdapter 接口 + 路由 + 注册
│       ├── catalog.ts                      # Source 列表 / 模型 ID / 显示标签 / Google-only 过滤
│       ├── keys.ts                         # provider → localStorage key 映射
│       ├── GeminiGenerator.ts              # 走 Gemini structured-output + 流式
│       ├── DeepSeekGenerator.ts            # OpenAI-兼容 chat + SSE 流式
│       ├── LocalBenchmarkGenerator.ts      # 从 GRPO 数据集查表，best-of-4
│       └── MockGenerator.ts                # 本地随机生成（无 API）
│
├── utils/
│   ├── modelImport.ts                      # brick-line / 体素 JSON / 数值网格 三态解析
│   ├── brickLibrary.ts                     # 14 种允许砖型常量（prompt + 验证器共享）
│   ├── constraintEvaluator.ts              # 5 项硬约束 + i18n keys + 重叠 brick ids
│   ├── voxelEvaluator.ts                   # 数值指标（连通性 / 对称性 / 颜色多样性 …）
│   ├── voxelGenerators.ts                  # 预设模型（ModernSofa / ModernLamp / Table）
│   ├── voxelConstants.ts                   # CONFIG（地板高度 / VOXEL_SIZE / 颜色）
│   ├── benchmarkData.ts                    # JSONL + JSON 异步加载 + 缓存
│   └── generationErrors.ts                 # 网络错误友好化（fetch failed → 提示）
│
├── i18n/
│   ├── translations.ts                     # en / zh 字典（≈220 keys）
│   └── LocaleContext.tsx                   # LocaleProvider + useT() hook
│
├── data/                                   # 不打进 JS bundle，Vite ?url 静态资产
│   ├── grpo_results.json                   # 254 条 GRPO 推理结果（k=4 sample）
│   └── test_prompts.jsonl                  # 254 条测试 prompt 与 ground-truth
│
├── tests/
│   └── generationErrors.test.ts            # node:test 单元测试
│
└── 配置文件: package.json / tsconfig.json / vite.config.ts / metadata.json
```

---

## 4 · 功能清单

### 4.1 生成

| 来源 (`SOURCE_OPTIONS.key`) | 类型 | API key | 输出格式 | 流式 |
|---|---|---|---|---|
| `gemini-2.5-flash` / `flash-lite` / `pro` / `3.1-pro-preview` | 在线 LLM | `gemini_api_key`（localStorage） | brick-line via `{ bricks: STRING }` JSON schema | ✓ `generateContentStream` |
| `deepseek-v4-pro` / `v4-flash` | 在线 LLM | `deepseek_api_key`（localStorage） | brick-line via `{ bricks: "..." }` json_object | ✓ SSE |
| `geo3d-grpo` | 本地查表 | — | brick-line (best-of-4 by `validity_score`) | 不需要 |
| `mock` | 本地随机 | — | 直接 `VoxelData[]` | 不需要 |
| `brickgpt` / `voxelAI` / `自定义` | 占位 | — | — | — |

**生成的核心契约**（`services/generators/index.ts`）：
```ts
interface GeneratorAdapter {
  readonly name: string;
  generate(prompt: string, apiKey: string, opts?: GenerationOptions): Promise<VoxelData[]>;
  lastBrickText?: string | null;        // brick-line 原文（如有）
  lastBricks?: BrickPiece[] | null;     // 已解析的 BrickPiece 数组
}
interface GenerationOptions {
  onProgress?: (p: { chars: number; lines: number; tail: string }) => void;
}
```

prompt 模板（Gemini / DeepSeek 共享，对齐 GRPO 训练）：
- 列出 14 种允许砖型（`utils/brickLibrary.ts` 唯一来源）。
- 强制最少 60 块、至少 4 层、按类别给参考块数（家具 60-120 / 建筑 120-250 / 角色 80-200 / 车辆 80-200）。
- 坐标范围 0..19；layer 0 = 地面；颜色不要包含（前端着色）。
- token 上限：Gemini 65 536；DeepSeek 32 768（V4 实际硬上限 384 K）。

### 4.2 渲染

`services/VoxelEngine.ts` 双模式：

- **Voxel mode**（旧路径）：单个 `InstancedMesh` of `BoxGeometry(0.95)`。每体素一颗小方块。
- **Brick mode**（新路径，默认）：每砖型一个 `InstancedMesh`，几何来自 `brickMeshLibrary` —— `BoxGeometry(sx-0.08, 0.92, sy-0.08)` 与每格一颗圆柱凸点合并。同一砖内部完全无缝，砖间露 0.08 单位缝。
- 入口：`loadBrickModel(bricks)` / `generateBrickEffect(bricks)`（带 scatter→spring rebuild 物理）；fallback：`loadInitialModel(voxels)` / `generateEffect(voxels)`。
- 物理动画：每砖一刚体（旧 voxel 模式是每格一刚体，密度差 1/8 ~ 1/12，砖模式反而更流畅）。
- 颜色管线：基础色 = `BRICK_COLORS[size]`（按砖型）；可被 `brickColorOverrides: Map<id, Color>` 覆盖；当 brick 在 `highlightedBrickIds` 集合中则强制 `#ef4444`。
- 公开 API（25 个 public 方法）：
  - 模型：`loadBrickModel` / `generateBrickEffect` / `loadInitialModel` / `generateEffect`
  - 互动：`setControlsEnabled` / `getDomElement` / `pickBrickAt` / `setAutoRotate` / `resetView`
  - 着色：`setBrickColor` / `clearBrickColorOverrides`
  - 约束：`setHighlightedBricks` / `clearHighlightedBricks` / `dropUnsupportedBricks` / `get isDroppingBricks`
  - 数据：`getJsonData` / `getBrickText` / `getBrickJson` / `hasBricks` / `getUniqueColors`
  - 相机：`getCameraState` / `setCameraState`
  - 生命周期：`handleResize` / `cleanup`

### 4.3 约束评估（5 项硬约束）

`utils/constraintEvaluator.ts` 输入 `(voxels, bricks?)`，输出 `ConstraintReport`：

| # | 名称 (key) | 输入需求 | 算法 | 权重 |
|---|---|---|---|---|
| 1 | `constraint.brick_library.name` 砖块库合规 | bricks | `<sx>x<sy>` 是否在 14 种允许砖型集合中 | 0.25 |
| 2 | `constraint.collision_free.name` 无碰撞 | bricks | 每砖展开为格子，记录是否有重复占用；附 `overlappingBrickIds` | 0.25 |
| 3 | `constraint.bounding_volume.name` 包围盒合规 | bricks | 每格是否落在 20×20×20 内 | 0.15 |
| 4 | `constraint.structural_stability.name` 结构稳定性 | bricks | **砖级**：每砖（除最底层）至少一格下方有另一砖；附 `overlappingBrickIds`（未支撑砖） | 0.20 |
| 5 | `constraint.topological_integrity.name` 拓扑完整性 | voxels | 6 邻接 BFS；要求单一连通分量 | 0.15 |

无 brick 数据时退化为 voxel-only 模式（5 项变成：体素唯一性 / 包围盒 / 地面合规 / 结构稳定性 / 拓扑完整性）。

`ConstraintResult` 字段：
```ts
interface ConstraintResult {
  nameKey: string;                                       // i18n key
  detailKey: string;
  detailParams?: Record<string, string | number>;
  passed: boolean;
  score: number;                                          // 0..1
  violations: ViolationDetail[];                          // { key, params } 模板化
  overlappingBrickIds?: string[];                         // 给 ConstraintPanel 👁 高亮用
  overlappingCells?: Array<[number, number, number]>;     // 体素级回退
  // English 兜底
  name: string; details: string; violationsText: string[];
}
```

综合 `validityScore = Σ(weight × score)`；`overallValid = 所有 passed`。

### 4.4 ConstraintPanel 交互（`components/ConstraintPanel.tsx`）

- **动画检测**：报告变更时进入 `running` 状态机，每项约 350 ms 依次揭示（spinner → pass/fail），最终亮出总评。`prefers-reduced-motion` 时直接显示终态。
- **重新检测按钮** `RefreshCw`：重放动画。
- **重叠高亮 👁**：违规行右侧出现 `Eye` / `EyeOff` 按钮，点击 → `engine.setHighlightedBricks(ids)`，砖块涂红；再点 → 复原。
- **落砖测试**：触发 `engine.dropUnsupportedBricks(unsupportedIds)`，引擎切到「物理掉落」分支，无支撑的砖块按重力落到地面，演示结构稳定性的物理含义。

### 4.5 着色（`components/ColorPanel.tsx`）

工具栏 `Palette` 图标（仅当 `hasBricks=true` 显示）打开浮窗。

- **AI 着色**：根据当前 `selectedModel` 决定 provider（Gemini 或 DeepSeek），调 `services/llmColor.ts` —— 把前 200 块砖 id + 尺寸 + prompt 喂给 LLM，回 `{ "<id>": "#RRGGBB" }`。
- **统一上色**：10 个 LEGO 经典预设色块 + `<input type="color">` 自定义；apply 后所有砖统一改色。
- **手动涂色**：开启后引擎禁用 OrbitControls、自动旋转暂停；canvas 上 `pointerdown` + `pointerup`（capture 阶段）+ 位移 < 8 px + 时间 < 800 ms 才算 click → `engine.pickBrickAt()` 拾取砖 id → `engine.setBrickColor()`。`manualPaintColor` 用 ref 持有，避免拖动调色板时频繁卸载/挂载 listener 造成卡顿。
- **重置 / 保存**：reset 清空 override；save 走 `customPresets` localStorage 流程。

### 4.6 流式输出

Gemini / DeepSeek 均开 stream，节流 50 ms 调 `onProgress({chars, lines, tail})`。Loading 浮层底部显示「已接收 N 行 · M 字符」+ 滚动 tail。

### 4.7 对比模式（`components/ComparisonView.tsx`）

- 左右双视口，各自独立的 `VoxelEngine` 实例。
- 顶栏：退出 / 标题 / 共享 prompt 输入 / 同时生成 / 指标开关 / 联动视角 / 数据集 / 历史。
- 每个视口独立的 source 下拉（受 Google-only 设置过滤）+ 重置按钮 + 进度浮层。
- 两侧各一个 `ConstraintPanel`（compact 模式）。
- 着色：每侧可单独开 `ColorPanel`（共享一个 AI 着色队列）。
- 联动视角：右侧实时 `setCameraState(leftEngine.getCameraState())`。
- 历史记录加载：`EvalHistory` 弹侧栏，可把任意历史记录加载到左 / 右槽位。
- Benchmark 数据集：弹 `BenchmarkPicker`，可同 prompt 同时跑两个 source（一边 GRPO best-of-4 + 一边 Gemini/DeepSeek）做 head-to-head。

### 4.8 国际化（`i18n/`）

- 字典：`translations.ts` 含 ≈220 个 key，覆盖所有 UI 文本 + 约束 name / detail / violation 模板。en 是回退；zh 默认。
- 切换：`LocaleProvider` 在 `index.tsx` 包裹；`useT()` hook 提供 `t(key, params?)`；持久化在 `localStorage['app_locale']`。
- 切换按钮：右下角浮动 `LanguageToggle`。
- `<html lang>` 跟随当前 locale。

### 4.9 模型蓝图（`components/JsonModal.tsx`）

- 两个 tab：`Brick Lines`（原文 brick-line）/ `Voxel JSON`（展开后的体素列表）。
- 当模型有 brick 数据时默认显示 Brick Lines；否则只显示 Voxel JSON tab。
- 复制按钮按当前 tab 复制对应内容。

### 4.10 Benchmark 加载器（`components/BenchmarkPicker.tsx`）

- 加载源：`utils/benchmarkData.ts` 异步 fetch `data/test_prompts.jsonl` + `data/grpo_results.json`，按 `prompt_idx` zip，对每条 prompt 在 4 个 sample 里选 `validity_score` 最高的作为「best-of-4」。模块级缓存。
- UI：搜索框 + 254 条记录滚动列表，每条带 Validity / Voxel / brick 数三色芯片。
- 单视图模式（App）：`singleMode=true`，整行一个加载按钮，加载到主视口。
- 对比模式：每行有「加载到左 / 加载到右」两个按钮；加载后自动填充共享 prompt 输入框。

### 4.11 设置面板（`components/ModelSourceSettings.tsx`）

右下角浮动 ⚙ 按钮，弹出 dialog。

- **Google-only**：模型选择器只保留 Gemini（用于演示 Google 技术栈，过滤掉 DeepSeek/Mock/GRPO）。
- **All vendors**（默认）：显示 Gemini / DeepSeek / Geo3D GRPO / Mock。
- 选择持久化在 `localStorage['voxel_model_picker_google_only']`。
- 切到 Google-only 且当前模型不是 Gemini → 自动跳到 `GEMINI_MODEL_OPTIONS[0]`。

### 4.12 历史记录（`components/EvalHistory.tsx`）

- 最多 50 条记录，写入 `localStorage['voxel_eval_history']`。
- 每条 `GenerationRecord` 含 prompt / model / 体素数 / 时间戳 / 评估指标 / 约束报告 / 原始 brick-line。
- JSON / CSV 导出；一键清空（带确认）。
- 对比模式里每条有「加载到左 / 加载到右」。

### 4.13 错误处理（`utils/generationErrors.ts`）

`describeGenerationFailure(error, provider, t)`：
- `fetch failed` / `NetworkError` → 按 provider 给针对性的中英文提示（API 故障、网络不通、跨域）。
- 其他错误 → 透传 `error.message`（如 401 invalid key、API 配额限制等）。

测试覆盖：`tests/generationErrors.test.ts`（3 个 case）。

---

## 5 · 关键数据流

### 5.1 生成 → 渲染 → 评估

```
用户点 「生成模型」 → PromptModal
  → handlePromptSubmit(prompt, apiKey)
    → getGenerator(selectedModel)
      → GeminiGenerator / DeepSeekGenerator / LocalBenchmarkGenerator / MockGenerator
        → 流式接收 brick-line 文本 (onProgress)
        → parseBrickPieces → BrickPiece[]
        → parseBrickLines → VoxelData[]（展开 + normalize）
    → engine.generateBrickEffect(bricks)         // 物理掉落动画 + InstancedMesh 渲染
    → evaluateAll(voxels) → EvaluationScores
    → parseBrickData(brickText) → BrickData[]
    → evaluateConstraints(voxels, bricks) → ConstraintReport
    → setConstraintReport / setCurrentBricks / setSourceInfo
    → appendRecord → localStorage history
```

### 5.2 重叠高亮 → 落砖测试

```
ConstraintPanel 「无碰撞」失败行
  → onHighlightOverlaps(result.overlappingBrickIds)
    → engine.setHighlightedBricks(ids)   # 砖块改红色
  
ConstraintPanel 「结构稳定性」失败行
  → 落砖按钮 → handleStructuralTest()
    → engine.dropUnsupportedBricks(unsupportedIds)   # 物理动画
```

### 5.3 着色

```
ColorPanel 「AI 着色」
  → suggestColors(prompt, bricks[0..200], apiKey, provider)
    → Gemini / DeepSeek → { "<id>": "#RRGGBB" }
  → 对每块 engine.setBrickColor(id, hex)

ColorPanel 「手动涂色」
  → engine.setControlsEnabled(false)
  → canvas pointerdown/up 捕获
  → engine.pickBrickAt(x, y) → brick id
  → engine.setBrickColor(id, manualPaintColorRef.current)
```

---

## 6 · 持久化（localStorage 键）

| key | 用途 |
|---|---|
| `app_locale` | 当前语言 `en` / `zh` |
| `gemini_api_key` | Gemini API 密钥 |
| `deepseek_api_key` | DeepSeek API 密钥 |
| `voxel_eval_history` | `GenerationRecord[]`（≤ 50） |
| `custom_voxel_presets` | 用户保存的 `SavedModel[]` |
| `voxel_model_picker_google_only` | `'1'` / `'0'` 设置 |

数据文件（不进 bundle、Vite `?url` 引入）：

- `data/grpo_results.json` — 2.84 MB，254 × 4 个 GRPO sample。
- `data/test_prompts.jsonl` — 537 KB，254 条 prompt + ground-truth brick-line。

---

## 7 · 关键架构决策

| 决策 | 取舍 |
|---|---|
| **brick-line 输出，不再让 LLM 输出每体素 JSON** | 同等 `max_tokens` 下几何密度 ~10×；与 GRPO 训练任务对齐；代价是失去逐格上色（由前端 `BRICK_COLORS` + 着色面板补回）。 |
| **每砖一刚体（而非每体素）** | 物理动画体感更流畅；约束打分语义更接近真实 LEGO（一块砖的部分支撑也算支撑）。 |
| **InstancedMesh per size** | 14 种砖型 × InstancedMesh 比 N 块 Mesh 减少一个数量级的 draw call；`setColorAt(i, color)` 天然支持每实例颜色。 |
| **Vite `?url` 加载数据集** | 3.4 MB 数据不进 JS chunk；首次打开 BenchmarkPicker 时按需 fetch；模块级缓存。 |
| **i18n keys 进 ConstraintResult** | `name`/`details`/`violations` 同时带 `nameKey`/`detailKey`/`violations: {key, params}[]`，约束语义在数据层，UI 层只 `t()` 渲染。 |
| **客户端零样本调 LLM** | 没有自有后端；密钥仅存浏览器；CORS 直连官方 API。代价是密钥暴露给浏览器；适合 demo / 本地评测，不适合生产。 |
| **Google-only 选项** | 演示 Google 技术栈时一键过滤 DeepSeek / Mock / GRPO；不破坏底层注册表，仅过滤显示。 |
| **本地 GRPO 用 `parseImportedModel`** | LocalBenchmarkGenerator 直接复用 brick-line 解析路径，统一规范化（centerX/Z + 地面归零）。 |

---

## 8 · 约束评估算法细节

### 8.1 砖块库合规
- `ALLOWED_BRICK_DIMENSIONS`：`2x4, 4x2, 2x6, 6x2, 1x2, 2x1, 1x4, 4x1, 1x6, 6x1, 1x8, 8x1, 1x1, 2x2`（14 种，对齐 GRPO 训练）。
- score = 合法砖数 / 总砖数；pass 阈值 = 1.0。

### 8.2 无碰撞
- 每砖展开为格子，记录占用；同一格被两块砖占即记一次碰撞。
- score = 1 − (碰撞格数 / 总占用格数)；pass = 0 碰撞。
- 输出 `overlappingBrickIds`（涉事砖块 id）+ `overlappingCells`（涉事格子坐标）。

### 8.3 包围盒合规
- 检查每砖的每个格子是否在 [0, 20) 区间。
- score = 完全合规砖数 / 总砖数；pass = 1.0。

### 8.4 结构稳定性（砖级）
- 找最低层 `minLayer`；其他砖：至少一格下方（`layer-1`）有另一砖的格子 → 算支撑。
- score = 有支撑砖数 / 非底层砖数；pass = ≥ 0.95。
- 输出未支撑砖 id 列表，可用 👁 高亮或落砖测试。

### 8.5 拓扑完整性
- 6 邻接 BFS（±x, ±y, ±z）on voxels。
- score = 最大连通分量 / 总体素；pass = 单一连通分量。

---

## 9 · 外部依赖

| 服务 | 端点 | 用途 |
|---|---|---|
| Google Generative AI | SDK `@google/genai` | Gemini 生成 + 评分 + 着色 |
| DeepSeek API | `https://api.deepseek.com/chat/completions` | DeepSeek V4 生成 + 着色 |
| GitHub Pages | `https://mzhang101.github.io/3dvoxel/` | 静态部署 |

---

## 10 · 已知限制与未来工作

- **OrbitControls 类型缺失**：`three/examples/jsm/controls/OrbitControls` 无 `.d.ts`，TS noEmit 留一条预先存在的 warning，不影响运行。
- **逐格上色不可用**：brick-line 不携带颜色；如要恢复，可让 LLM 输出 `palette: { "2x4": "#FF0000" }` 字段，前端 merge 到 `BRICK_COLORS`。
- **结构稳定性仍是垂直支撑**：未考虑横向砖接，悬臂结构会被低估；可引入横向邻接来奖励侧贴接合。
- **`deepseek-chat` 别名 2026-07-24 弃用**：已切到 `deepseek-v4-pro` / `deepseek-v4-flash` 正式 ID，DeepSeek 官方升级时无需迁移。
- **API key 暴露**：浏览器 localStorage 存明文，仅适用于本地演示；生产应走自有后端代理。
- **空间扁平**：所有模型默认 20³ 包围盒；过大模型会被裁切到边界外才检测出来。
- **Benchmark loader 只覆盖 GRPO 测试集**：要纳入 SFT baseline 需要额外数据文件。
- **MetricsPanel 的 LLM Judge 仅 Gemini**：DeepSeek 评分未接通，对比模式下两侧都用 Gemini judge。

---

## 11 · 演示路径建议

1. **首屏** → WelcomeScreen 显示 LEGO 动画 + 项目简介；点 「开始」。
2. **预设** → 选 `Modern Lamp` → 模型以 LEGO 风格渲染 → 工具栏 `Palette` 亮 → 试 AI 着色。
3. **GRPO 数据集** → 进对比模式 → 数据集 → 选 "Open-top basket..." → 左侧加载 GRPO → 右侧选 `DeepSeek V4 Pro` → 同时生成 → 两侧 ConstraintPanel 同步动画。
4. **约束演示** → 左侧合规分 0.96，右侧 0.78 → 点右侧 「无碰撞」👁 → 红色高亮 → 切到「结构稳定性」失败行 → 落砖测试 → 不稳定砖物理掉落。
5. **指标导出** → 历史侧栏 → JSON / CSV 下载 → 写报告。
6. **i18n** → 右下 EN / 中 切换演示完整双语支持。

---

## 12 · 当前代码体量

```
LOC（非空源代码）              8 072
TS/TSX 文件                       39
React 组件                        13
Generator adapter                  5（Gemini / DeepSeek / Local / Mock + 接口）
约束检查                            5
i18n key                       ≈220
GRPO 测试集 prompt              254
```

主要模块行数：

| 文件 | LOC |
|---|---|
| `App.tsx` | 682 |
| `components/ComparisonView.tsx` | 830 |
| `services/VoxelEngine.ts` | 745 |
| `utils/constraintEvaluator.ts` | 694 |
| `i18n/translations.ts` | 551 |
| `components/ConstraintPanel.tsx` | 450 |
| `components/UIOverlay.tsx` | 438 |
| `components/MetricsPanel.tsx` | 363 |
| `utils/voxelGenerators.ts` | 263 |
| `components/WelcomeScreen.tsx` | 257 |
| `utils/modelImport.ts` | 255 |

---

**当前构建状态**：`npx vite build` 通过；`npx tsc --noEmit` 仅剩 OrbitControls 的预先存在 warning；`node --test tests/` 全绿。

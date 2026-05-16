# Voxel Toy Box（3D Voxel / LEGO 风格生成器）

基于 **React 19**、**Vite 6** 与 **Three.js** 的 Web 应用：用自然语言或文件驱动 **体素 / 积木** 3D 模型，支持多模型后端、约束检测、侧向对比评测与 AI 上色。可作为 **Geo3D / GRPO** 相关工作的交互式演示或基准前端。

**在线参考（若已配置 GitHub Pages）**：部署根路径为 [`vite.config.ts`](vite.config.ts) 中的 `base: '/3dvoxel/'`，典型地址为  
`https://<user>.github.io/3dvoxel/`。

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [API 密钥与模型来源](#api-密钥与模型来源)
- [支持的模型与生成器](#支持的模型与生成器)
- [数据导入与导出](#数据导入与导出)
- [约束与几何评测](#约束与几何评测)
- [对比模式（Comparison）](#对比模式comparison)
- [配色与 AI 上色](#配色与-ai-上色)
- [国际化](#国际化)
- [构建与部署](#构建与部署)
- [目录结构](#目录结构)
- [相关资源](#相关资源)
- [许可证](#许可证)

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **3D 引擎** | `VoxelEngine`：积木实例化渲染（凸点、阴影、雾），轨道控制、自动旋转、组装动效；支持按砖块拾取与高亮。 |
| **文本生成** | 通过提示词调用 **Gemini**、**DeepSeek** 或 **Mock**；**Geo3D GRPO** 为本地基准数据回放（无需 API）。 |
| **模型来源设置** | 右下角齿轮：「仅 Google（Gemini）」与「Gemini + DeepSeek + Geo3D + Mock」两种列表，写入 `localStorage`。 |
| **预设与自定义** | 内置体素预设（如 Modern Sofa）；可将当前场景保存为自定义预设（`localStorage`）。 |
| **导入** | JSON 体素数组、带 `bricks` / `model_3d_bricks` 的 JSON、纯文本砖行（parquet 风格）。 |
| **导出 / 查看** | JSON 弹窗展示体素 JSON 与可选的 brick-line 文本。 |
| **约束面板** | 砖库、无碰撞、包围盒、稳定性、拓扑等；可高亮重叠砖块。 |
| **几何评测** | 体素数、包围盒、连通性、对称、颜色多样性、贴地等（`voxelEvaluator`）。 |
| **LLM 裁判** | 对比流程中可选 Gemini 对结构/美感等维度打分（`llmJudge`）。 |
| **对比视图** | 双视口、双生成源、指标与约束面板、评测历史、基准数据集选择。 |
| **配色** | 统一上色、手动点砖上色、AI 建议配色（Gemini/DeepSeek）、重置与保存带色预设。 |

---

## 技术栈

- **UI**：React 19、TypeScript 5.8、Tailwind 风格类名（内联于组件）
- **3D**：Three.js（`OrbitControls`、实例化网格、`brickMeshLibrary`）
- **构建**：Vite 6、`@vitejs/plugin-react`
- **Google AI**：`@google/genai`（Gemini 生成、裁判、配色等）
- **图标**：`lucide-react`

---

## 快速开始

**环境**：Node.js 18+（推荐 LTS）。

```bash
npm install
npm run dev
```

默认开发服务器：`http://localhost:3000`（见 `vite.config.ts` 中 `server.port`）。

生产构建与预览：

```bash
npm run build
npm run preview
```

> **说明**：旧版 README 曾提到在 `.env.local` 中配置 `GEMINI_API_KEY`。当前应用内的 **Gemini / DeepSeek 密钥主要通过提示弹窗输入**，并持久化到浏览器 **localStorage**（见下文）。若你希望从环境变量注入密钥，需在代码中自行读取 `import.meta.env.VITE_*` 并与现有 `keys` 逻辑对接。

---

## API 密钥与模型来源

### localStorage 键名

| 键 | 用途 |
|----|------|
| `gemini_api_key` | Google Gemini 调用（生成、裁判、配色等） |
| `deepseek_api_key` | DeepSeek 文本生成与配色 |
| `voxel_model_picker_google_only` | `1` 时模型菜单仅展示 Gemini；`0` 或未设置为「多厂商 + Mock」 |
| `custom_voxel_presets` | 用户保存的自定义预设 JSON 数组 |

实现见 [`services/generators/keys.ts`](services/generators/keys.ts)。

### 模型来源设置（齿轮菜单）

- **仅 Google（Gemini）**：适合对外演示「全线 Gemini」场景；若当前选中非 Gemini 子型号，会自动切回默认 Flash。
- **Gemini、DeepSeek、Geo3D 与 Mock**：完整后端列表，与对比视图中来源选择器一致。

---

## 支持的模型与生成器

注册与路由逻辑见 [`services/generators/index.ts`](services/generators/index.ts)，选项定义见 [`services/generators/catalog.ts`](services/generators/catalog.ts)。

| 来源键 / 子型号 | 说明 |
|-----------------|------|
| **Gemini** | 多子型号（如 `gemini-2.5-flash`、`gemini-2.5-pro` 等），带模型候选回退（`geminiModelFallback.ts`）。 |
| **DeepSeek** | `deepseek-v4-pro` / `deepseek-v4-flash` 等，HTTP API 生成。 |
| **geo3d-grpo** | `LocalBenchmarkGenerator`：读取打包的 `data/grpo_results.json` 等，本地 best-of 风格结果。 |
| **mock** | 无网络占位生成，便于开发与对照实验。 |

未实现的占位项（catalog 中 `enabled: false`）：BrickGPT、VoxelAI、自定义等，选择时会抛错提示未配置。

---

## 数据导入与导出

### 导入（界面 **Import**，`.json` / `.txt`）

1. **体素 JSON 数组**  
   `[{"x":0,"y":0,"z":0,"color":"#ffaa00"}, ...]`  
   颜色可为 `#RRGGBB` 字符串（解析逻辑见 `utils/modelImport.ts`）。

2. **带砖行的 JSON**  
   - `bricks`: 多行文本，如 `"1x4 (15,13,0)\n2x6 (13,5,0)"`  
   - 或 `model_3d_bricks` 同类字段。

3. **纯文本砖行**  
   每行形如：`1x4 (15,13,0)`（与 parquet 提取风格一致）。

仓库内示例：`demo-parquet-bricks.json`。

### 导出

- **Code** 按钮：打开 JSON 模态框，包含当前体素 JSON；若引擎持有砖表示，可同时展示 **brick-line** 文本（`JsonModal`）。

---

## 约束与几何评测

- **`utils/constraintEvaluator.ts`**：在体素与/或砖块层级上检查砖库合法性、碰撞、包围、支撑、连通性等，产出 `ConstraintReport` 供 UI 与历史记录使用。
- **`utils/voxelEvaluator.ts`**：`evaluateAll` 产出 `EvaluationScores`（包围盒、连通分量、对称、颜色多样性、贴地误差、表面比等）。
- **约束面板**（`ConstraintPanel`）：与 GRPO 训练中的硬约束叙事对齐的说明文案（中英文见 `i18n/translations.ts`）。

---

## 对比模式（Comparison）

从主界面进入 **Compare**（`ComparisonView`）：

- 左右独立 **VoxelEngine**、独立生成源下拉框（受「模型来源」设置过滤）。
- **指标**、**约束**、**评测历史**、**基准数据集**（`BenchmarkPicker` + `utils/benchmarkData.ts`）。
- 可选 **LLM 裁判**（需 Gemini Key）。
- 视图可 **联动旋转** 或自由操作；支持重置视角。

---

## 配色与 AI 上色

- **ColorPanel**：统一颜色、手动点选砖块上色（与 `OrbitControls` 协调，避免拖拽误判）、重置覆盖色、将带色体素写入新预设。
- **`services/llmColor.ts`**：根据当前提示词与砖列表，让 Gemini 或 DeepSeek 返回每砖颜色建议。

---

## 国际化

- **`i18n/LocaleContext.tsx`** + **`i18n/translations.ts`**：英文 `en` / 中文 `zh`。
- **`LanguageToggle`**：固定在右下角切换语言。

新增文案时请在 `TRANSLATIONS.en` 与 `TRANSLATIONS.zh` 中同步增加键值。

---

## 构建与部署

### `base` 路径

[`vite.config.ts`](vite.config.ts) 中设置了：

```ts
base: '/3dvoxel/',
```

若仓库使用 **GitHub Pages** 且项目不在域名根路径，请保持与仓库名或 Pages 子路径一致；若部署在根域名，可改为 `'/'` 后重新构建。

### 产物

`npm run build` 输出到 `dist/`。大型静态数据（如 `data/grpo_results.json`）会作为资源打包，首屏 JS 体积较大属预期现象；如需优化可考虑懒加载或 CDN。

---

## 目录结构（摘要）

```
├── App.tsx                 # 主应用状态：引擎、生成、导入、配色、对比入口
├── index.tsx               # React 挂载 + LocaleProvider
├── types.ts                # 共享类型（体素、砖、评测记录等）
├── components/             # UI 组件（覆盖层、弹窗、对比、约束、配色等）
├── services/
│   ├── VoxelEngine.ts      # Three.js 场景与砖/体素逻辑
│   ├── brickMeshLibrary.ts # 砖网格资源
│   ├── llmJudge.ts / llmColor.ts
│   └── generators/       # Gemini、DeepSeek、Mock、LocalBenchmark 等
├── utils/
│   ├── modelImport.ts      # 解析导入、体素↔砖
│   ├── constraintEvaluator.ts
│   ├── voxelEvaluator.ts
│   ├── voxelGenerators.ts  # 内置体素预设
│   └── benchmarkData.ts
├── data/                   # 本地基准 JSON（如 grpo_results）、测试 prompts 等
├── i18n/
└── vite.config.ts
```

---

## 相关资源

- **Google AI Studio 应用页**（若仍关联）：  
  https://ai.studio/apps/d59977ff-215b-402c-a78e-5bc1c071c31e  
- **本仓库远程**（示例）：`https://github.com/mzhang101/3dvoxel.git`（以你实际 `git remote` 为准）。

---

## 许可证

源代码文件头可见 **SPDX-License-Identifier: Apache-2.0**（与上游 AI Studio 模板一致）。使用第三方 API（Gemini、DeepSeek）时须遵守各服务商条款。

---

## 贡献与开发说明

- 尽量在单 PR 内保持改动与 **单一功能/修复** 对应，避免无关大重构。
- 修改生成协议或约束语义时，请同步更新本 README 与 `translations` 中的用户可见说明。

如有问题或希望扩展新的生成器后端，可在 Issue 中说明预期接口（与 `GeneratorAdapter` 对齐）。

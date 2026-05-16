# Voxel Asset Project Overview

本文档基于当前代码库内容整理，用于快速理解项目定位、功能范围、架构组成、数据格式、运行部署方式，以及目前仍需要注意的事项。

最后整理时间：2026-05-09

## 1. 项目定位

本项目是一个浏览器端的 3D 体素资产生成、展示与评估工具。用户可以在网页中查看由方块组成的 3D 模型，加载内置预设，导入外部积木数据，也可以通过 Gemini 文本提示生成新的体素模型。

项目核心目标可以概括为：

- 用 Three.js 渲染 voxel/brick 风格的 3D 资产。
- 用 React 构建交互界面。
- 支持从 Prompt 生成 3D 体素模型。
- 支持导入 parquet 提取后的 brick-line 数据。
- 对生成结果进行结构化指标评估。
- 支持两个生成来源或模型的并排对比。

当前项目名称在 `package.json` 中为 `voxel-toy-box`，页面标题为 `Voxel Architect`，AI Studio 元数据中名称为 `Voxel asset`。

## 2. 技术栈

### 前端与构建

- React 19
- TypeScript
- Vite 6
- Three.js
- Lucide React 图标库
- Tailwind CSS CDN

### AI 与生成

- `@google/genai`
- Gemini 模型选择与 fallback 机制
- Mock 生成器作为本地占位生成源

### 部署

- Vite 静态构建
- GitHub Pages workflow
- Vite `base` 配置为 `/3dvoxel/`

## 3. 目录结构

```text
.
├── App.tsx
├── index.tsx
├── index.html
├── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── metadata.json
├── README.md
├── demo-parquet-bricks.json
├── train-00000-of-00006.parquet
├── update_overlay.sh
├── components/
│   ├── UIOverlay.tsx
│   ├── WelcomeScreen.tsx
│   ├── PromptModal.tsx
│   ├── JsonModal.tsx
│   ├── ComparisonView.tsx
│   ├── MetricsPanel.tsx
│   └── EvalHistory.tsx
├── services/
│   ├── VoxelEngine.ts
│   ├── geminiModelFallback.ts
│   ├── llmJudge.ts
│   └── generators/
│       ├── index.ts
│       ├── catalog.ts
│       ├── GeminiGenerator.ts
│       └── MockGenerator.ts
├── utils/
│   ├── voxelConstants.ts
│   ├── voxelGenerators.ts
│   ├── voxelEvaluator.ts
│   └── modelImport.ts
└── .github/
    └── workflows/
        └── deploy-pages.yml
```

## 4. 应用主流程

### 4.1 启动与渲染

入口文件是 `index.tsx`，它将 `App` 挂载到 `#root`。

`App.tsx` 初始化时会：

1. 创建 `VoxelEngine`。
2. 加载内置 `ModernSofa` 作为初始模型。
3. 绑定窗口 resize 事件。
4. 默认开启自动旋转。
5. 展示短暂的欢迎提示。

### 4.2 Three.js 引擎

`services/VoxelEngine.ts` 是 3D 渲染核心，负责：

- 创建 Three.js scene、camera、renderer。
- 添加 OrbitControls。
- 添加环境光、方向光和地面。
- 使用 `InstancedMesh` 高效绘制大量体素方块。
- 控制自动旋转。
- 在新模型加载时播放“散落到重组”的动画。
- 导出当前模型 JSON。
- 获取和设置相机状态，用于对比模式中的视角同步。
- 清理 Three.js 资源，避免内存泄漏。

模型的基本渲染单位是 `VoxelData`：

```ts
interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}
```

## 5. 主要功能

### 5.1 内置预设模型

内置模型定义在 `utils/voxelGenerators.ts` 中，当前包含：

- `ModernSofa`
- `ModernLamp`
- `Table`
- `Eagle`
- `Cat`
- `Rabbit`
- `Twins`

当前 UI 中主要暴露的预设是：

- Modern Sofa
- Modern Lamp
- Table
- 用户保存的自定义预设

这些预设通过手写程序生成体素坐标，并使用 `Map` 去重，避免多个体素占用同一个坐标。

### 5.2 Prompt 生成模型

用户点击 `Generate Model` 后，会打开 `PromptModal`。弹窗允许用户输入：

- Gemini API Key
- 文本 prompt

提交后，`App.tsx` 会：

1. 读取或保存 API Key 到浏览器 `localStorage`。
2. 根据当前选择的生成模型调用 `getGenerator()`。
3. 获取生成结果 `VoxelData[]`。
4. 用 `VoxelEngine.generateEffect()` 播放重建动画。
5. 调用 `evaluateAll()` 计算指标。
6. 将生成记录写入评估历史。

当前 Gemini 生成器位于 `services/generators/GeminiGenerator.ts`，要求模型返回 JSON 数组，每一项包含：

```json
{
  "x": 0,
  "y": 0,
  "z": 0,
  "color": "#FF5500"
}
```

生成器会将十六进制颜色字符串转换为数字颜色值。

### 5.3 生成源与模型选择

生成源定义在 `services/generators/catalog.ts`。

当前可用源：

- Gemini
- Mock

Gemini 下包含多个模型选项：

- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `gemini-3.1-pro-preview`

占位但未启用的源：

- BrickGPT
- VoxelAI
- Custom

这些未启用源在 registry 中也有注册，但调用时会抛出“尚未实现”错误。

### 5.4 Gemini fallback

`services/geminiModelFallback.ts` 提供通用 fallback 方法：

- 生成模型 fallback：
  - `gemini-2.5-flash`
  - `gemini-flash-latest`
  - `gemini-2.5-flash-lite`

- 评审模型 fallback：
  - `gemini-2.5-flash-lite`
  - `gemini-2.5-flash`
  - `gemini-flash-latest`

当遇到以下错误类型时，会尝试下一个候选模型：

- `NOT_FOUND`
- `UNAVAILABLE`
- `RESOURCE_EXHAUSTED`
- HTTP 404
- HTTP 429
- HTTP 503

### 5.5 Mock 生成器

`services/generators/MockGenerator.ts` 是本地模拟生成器。它会随机选择一个内置预设：

- ModernSofa
- ModernLamp
- Table

然后对颜色做轻微扰动，用于没有真实 AI 调用时的演示或对比。

### 5.6 模型导入

导入逻辑在 `utils/modelImport.ts`。

当前支持的导入格式：

#### JSON voxel array

```json
[
  { "x": 0, "y": 0, "z": 0, "color": "#ffaa00" }
]
```

也兼容 `c` 字段作为颜色：

```json
[
  { "x": 0, "y": 0, "z": 0, "c": "#ffaa00" }
]
```

#### 包含 data 字段的对象

```json
{
  "data": [
    { "x": 0, "y": 0, "z": 0, "color": "#ffaa00" }
  ]
}
```

#### brick-line 文本

```text
1x4 (15,13,0)
2x6 (13,5,0)
```

#### 包含 bricks 字段的对象

```json
{
  "bricks": "1x4 (15,13,0)\n2x6 (13,5,0)"
}
```

#### 包含 model_3d_bricks 字段的对象

```json
{
  "model_3d_bricks": "1x4 (15,13,0)\n2x6 (13,5,0)"
}
```

#### numeric grid

如果 JSON 中包含 `stability_scores` 数组，会将正数值转换为体素，并按数值生成颜色深浅。

### 5.7 导入归一化

导入后的模型会经过 `normalizeModel()`：

- 将模型底部移动到 `y = 0`。
- 根据 x/z 包围盒居中到原点附近。
- 坐标四舍五入。
- 去除重复体素。
- 缺失或非法颜色使用默认颜色。

这使外部数据更容易在统一的 Three.js 场景中查看。

### 5.8 JSON 导出

点击代码按钮会打开 `JsonModal`，展示当前模型 JSON。

导出格式示例：

```json
[
  {
    "id": 0,
    "x": 0,
    "y": 0,
    "z": 0,
    "c": "#ffffff"
  }
]
```

弹窗支持复制到剪贴板。

### 5.9 保存自定义预设

点击保存按钮后，会将当前模型保存到浏览器 `localStorage`，key 为：

```text
custom_voxel_presets
```

保存的数据结构为：

```ts
interface SavedModel {
  name: string;
  data: VoxelData[];
  baseModel?: string;
}
```

保存后，自定义预设会出现在 Presets 菜单中。

## 6. 对比模式

对比模式由 `components/ComparisonView.tsx` 实现。

进入方式：

- 点击主界面右上角 Compare 按钮。

主要能力：

- 左右两个 Three.js 视口并排显示。
- 左右视口可以选择不同生成源或 Gemini 模型。
- 输入同一个 prompt 后点击 `Generate Both` 同时生成。
- 支持 linked views，让右侧视口跟随左侧相机。
- 支持单独或同步 reset view。
- 支持展示指标面板。
- 支持打开历史记录并将历史模型加载到左侧或右侧。

对比模式使用两个独立的 `VoxelEngine` 实例，并通过 `getCameraState()` / `setCameraState()` 实现视角同步。

## 7. 评估系统

评估逻辑在 `utils/voxelEvaluator.ts`，入口方法为：

```ts
evaluateAll(voxels: VoxelData[]): EvaluationScores
```

当前评估指标包括：

### 7.1 Voxel Count

体素总数，用于描述模型规模和细节密度。

### 7.2 Bounding Box

计算模型在 x/y/z 三个方向上的最小值、最大值和尺寸。

### 7.3 Connectivity

使用 6 邻接 BFS 检查模型连通性：

- `isFullyConnected`
- `componentCount`
- `largestComponentSize`

如果 `componentCount` 为 1，说明模型是完全连通的。

### 7.4 Symmetry

检查模型关于 `x = 0` 平面的镜像对称程度，返回 0 到 1 的分数。

### 7.5 Color Diversity

统计：

- 不同颜色数量。
- HSL 方差。
- 主色。

### 7.6 Centering Error

计算模型体素中心在 x/z 平面上距离原点的偏移。

### 7.7 Floor Compliance

检查模型是否全部位于 `y >= 0`。

### 7.8 Surface Ratio

计算暴露面数量占总面数量的比例，用于粗略衡量模型表面复杂度。

## 8. LLM Judge

`services/llmJudge.ts` 提供 AI 评审能力。它会把生成结果压缩成摘要，再让 Gemini 对模型进行四项评分：

- Prompt adherence
- Structural quality
- Aesthetic score
- Creativity

每项分数范围为 0 到 10，并返回一段简短 commentary。

当前在对比模式中会以 fire-and-forget 方式调用 LLM Judge。如果失败，不会阻塞主要生成流程。

注意：函数名当前为 `judgGeneration`，疑似拼写遗漏了字母 `e`，后续可以考虑改为 `judgeGeneration`。

## 9. 历史记录

评估历史由 `components/EvalHistory.tsx` 管理，保存在浏览器 `localStorage`。

存储 key：

```text
voxel_eval_history
```

最多保留：

```text
50 条
```

历史记录包含：

- id
- prompt
- model
- timestamp
- generationTimeMs
- voxelData
- evaluation
- llmJudge

支持导出：

- JSON
- CSV

支持清空历史，并支持把历史记录加载到对比模式的左侧或右侧视口。

## 10. 数据文件

### 10.1 demo-parquet-bricks.json

这是一个示例 brick-line 文件，来源标记为：

```text
train-00000-of-00006.parquet
```

示例描述：

```text
Square basket with layered construction and a recessed interior.
```

其 `bricks` 字段包含多行类似下面的积木描述：

```text
1x1 (15,17,0)
1x4 (15,13,0)
1x8 (15,5,0)
2x6 (13,12,0)
```

导入时会被展开为多个体素。

### 10.2 train-00000-of-00006.parquet

这是一个 Apache Parquet 文件，大小约 5.4 MB。当前前端应用没有直接解析 parquet 文件，而是通过 JSON 或文本格式导入从 parquet 中提取后的 brick-line 数据。

如果后续需要直接读取 parquet，需要新增解析流程，通常会放在构建前的数据预处理脚本或服务端，而不是直接在浏览器运行时处理。

## 11. 运行方式

### 11.1 安装依赖

```bash
npm install
```

### 11.2 本地开发

```bash
npm run dev
```

Vite 配置中指定：

```ts
server: {
  port: 3000,
  host: '0.0.0.0',
}
```

默认本地访问地址通常是：

```text
http://localhost:3000
```

### 11.3 构建

```bash
npm run build
```

构建产物输出到：

```text
dist/
```

### 11.4 预览构建产物

```bash
npm run preview
```

## 12. API Key 使用现状

README 中写到需要在 `.env.local` 设置 `GEMINI_API_KEY`，但当前代码实际没有读取 `import.meta.env` 或 `GEMINI_API_KEY`。

当前实现是：

1. 用户在 `PromptModal` 中输入 Gemini API Key。
2. `App.tsx` 将其保存到浏览器 `localStorage`。
3. 后续生成时优先使用已保存的 key。

对应 localStorage key：

```text
gemini_api_key
```

因此，当前 README 与代码实现存在轻微不一致。后续可以选择：

- 更新 README，说明 API Key 从 UI 中输入。
- 或修改代码，让它支持 `.env.local` 中的 `VITE_GEMINI_API_KEY`。
- 或同时支持两者，但不要把真实 key 提交到仓库。

## 13. 部署

GitHub Pages 工作流位于：

```text
.github/workflows/deploy-pages.yml
```

触发条件：

- push 到 `main`
- 手动 workflow dispatch

流程：

1. Checkout
2. Setup Node 20
3. `npm ci`
4. `npm run build`
5. 上传 `dist`
6. 部署到 GitHub Pages

Vite 配置中：

```ts
base: '/3dvoxel/'
```

这表示部署路径预期为 GitHub Pages 的 `/3dvoxel/` 子路径。如果仓库名或部署路径变化，需要同步修改 `vite.config.ts`。

## 14. 当前工作区状态

当前代码库包含已经构建好的 `dist/`，也包含 `node_modules/` 和 `.venv/`。

仓库中存在未提交或新增文件，主要包括：

- `App.tsx`
- `components/UIOverlay.tsx`
- `services/VoxelEngine.ts`
- `types.ts`
- `components/ComparisonView.tsx`
- `components/EvalHistory.tsx`
- `components/MetricsPanel.tsx`
- `services/geminiModelFallback.ts`
- `services/generators/`
- `services/llmJudge.ts`
- `utils/voxelEvaluator.ts`
- `update_overlay.sh`

这说明当前项目可能处于功能开发中间状态，尤其是对比、评估、生成器抽象等能力看起来是近期新增内容。

## 15. 需要注意的问题

### 15.1 `index.css` 为空

项目主要依赖 Tailwind CDN 和组件内 className，`index.css` 当前为空。

### 15.2 Tailwind 使用 CDN

`index.html` 通过 CDN 引入 Tailwind：

```html
<script src="https://cdn.tailwindcss.com"></script>
```

这对原型和 AI Studio 应用很方便，但生产项目通常更建议使用构建期 Tailwind 配置，以便：

- 产物更小。
- 样式更可控。
- 避免运行时 CDN 依赖。

### 15.3 README 与 API Key 实现不一致

如第 12 节所述，README 说明 `.env.local`，代码实际使用浏览器 localStorage。

### 15.4 LLM Judge 只在对比模式中完整展示

主生成流程会保存基础评估指标，但 LLM Judge 主要在 `ComparisonView` 中异步调用并展示。

### 15.5 缺少自动化测试

当前 `package.json` 没有 test 脚本，也没有明显的测试目录。

高风险模块建议后续补测试：

- `utils/modelImport.ts`
- `utils/voxelEvaluator.ts`
- `services/geminiModelFallback.ts`
- `services/generators/index.ts`

### 15.6 parquet 文件未被浏览器直接消费

项目包含 `.parquet` 数据，但前端导入按钮只接受 `.json,.txt`。当前实际导入链路是导入 parquet 提取后的 JSON 或文本。

### 15.7 `update_overlay.sh` 像一次性补丁脚本

`update_overlay.sh` 使用 `sed` 修改 `UIOverlay.tsx` 类型定义，像是临时迁移脚本。若已不再需要，建议清理或迁移到正式脚本说明中。

## 16. 建议后续改进

### 16.1 文档与运行方式对齐

优先更新 README，使其与当前 API Key 逻辑、导入格式、对比模式和评估能力一致。

### 16.2 为核心纯函数补测试

建议从以下模块开始：

- `parseImportedModel()`
- `evaluateAll()`
- `computeConnectivity()`
- `computeSymmetry()`
- `runWithGeminiModelFallback()`

这些函数大多不依赖 DOM，测试成本低，收益高。

### 16.3 统一生成记录中的 LLM Judge 持久化

当前 `GenerationRecord` 支持 `llmJudge` 字段，但部分流程保存记录时只保存基础 evaluation。可以考虑在 LLM Judge 返回后更新历史记录。

### 16.4 完善生成源插件化

当前已有 registry 雏形，可以继续扩展为稳定插件接口：

```ts
interface GeneratorAdapter {
  readonly name: string;
  generate(prompt: string, apiKey: string): Promise<VoxelData[]>;
}
```

后续可接入：

- BrickGPT
- VoxelAI
- 本地模型
- 上传模型文件转换器

### 16.5 增加 parquet 预处理工具

如果项目目标包含 BrickGPT/parquet 数据集，可以增加一个 Node 或 Python 脚本，将 parquet 批量转换成前端可导入的 JSON。

建议输出格式：

```json
{
  "source": "train-00000-of-00006.parquet",
  "format": "brick-lines",
  "structure_id": "...",
  "caption": "...",
  "bricks": "..."
}
```

### 16.6 明确坐标系统

当前代码中有两套坐标语义：

- 体素渲染坐标：`x, y, z`
- 数据集 brick-line：`sizeX x sizeY (x, y, layer)`

`modelImport.ts` 中将数据集 layer 转为渲染 y 轴：

```ts
x: baseX + dx,
y: baseZ,
z: baseY + dy,
```

建议在 README 或数据说明中明确这一点。

## 17. 快速理解模块职责

| 模块 | 职责 |
| --- | --- |
| `App.tsx` | 应用状态、主流程编排、弹窗、生成、导入、保存、对比入口 |
| `VoxelEngine.ts` | Three.js 场景、渲染、动画、相机、资源清理 |
| `UIOverlay.tsx` | 主界面工具栏、模型选择、预设选择、功能按钮 |
| `PromptModal.tsx` | Prompt 和 API Key 输入 |
| `JsonModal.tsx` | 当前模型 JSON 展示与复制 |
| `ComparisonView.tsx` | 双视口对比、双模型生成、指标与历史面板 |
| `MetricsPanel.tsx` | 指标表格、说明 tooltip、LLM Judge 雷达图 |
| `EvalHistory.tsx` | 生成记录保存、导出、清空、加载 |
| `voxelGenerators.ts` | 内置 procedural voxel 模型 |
| `modelImport.ts` | 外部模型格式解析与归一化 |
| `voxelEvaluator.ts` | 几何与颜色评估指标 |
| `GeminiGenerator.ts` | Gemini 文生 voxel JSON |
| `MockGenerator.ts` | 本地随机预设生成 |
| `catalog.ts` | 生成源和模型选项定义 |
| `geminiModelFallback.ts` | Gemini 模型 fallback |
| `llmJudge.ts` | AI 评审生成结果 |

## 18. 一句话总结

这是一个已经具备基础可用能力的 3D voxel AI 生成器：前端能展示和动画化体素模型，能通过 Gemini 生成新模型，能导入 brick-line 数据，能保存和导出结果，并且已经开始加入模型对比、指标评估和历史记录体系。当前最值得补齐的是 README 对齐、测试、API Key 配置一致性，以及 parquet 数据处理链路。

export type Locale = 'en' | 'zh';

type Dict = Record<string, string>;

export const TRANSLATIONS: Record<Locale, Dict> = {
  en: {
    // ===== App / source labels =====
    'app.source.preset': 'Preset · {name}',
    'app.source.preset.modern_sofa': 'Preset · Modern Sofa',
    'app.source.preset.modern_lamp': 'Preset · Modern Lamp',
    'app.source.preset.table': 'Preset · Table',
    'app.source.imported': 'Imported · {file}',
    'app.source.gemini': 'Gemini · {model}',
    'app.source.deepseek': 'DeepSeek · {model}',
    'app.source.mock': 'Mock generator',
    'app.alert.preset_saved': 'Saved to presets successfully!',
    'app.alert.preset_save_failed': 'Failed to save preset.',
    'app.alert.preset_name_prompt': 'Enter a name for this preset:',
    'app.alert.preset_default_name': 'Preset {n}',
    'app.alert.missing_api_key.gemini': 'Missing API key. Paste your Gemini API key in the modal.',
    'app.alert.missing_api_key.deepseek': 'Missing API key. Paste your DeepSeek API key in the modal.',
    'app.alert.import_failed': 'Import failed: {message}',
    'app.alert.generation_failed': 'Generation failed: {message}',

    // ===== UIOverlay top header / icons =====
    'ui.brand.title': 'VOXEL AI',
    'ui.brand.subtitle': 'Generator',
    'ui.count': 'Count',
    'ui.icon.info': 'Info',
    'ui.icon.pause': 'Pause',
    'ui.icon.play': 'Play',
    'ui.icon.code': 'Code',
    'ui.icon.import': 'Import',
    'ui.icon.save_preset': 'Save Preset',
    'ui.icon.compare': 'Compare',
    'ui.icon.constraints': 'Constraints',
    'ui.icon.benchmark': 'Benchmark',

    // ===== UIOverlay loading messages =====
    'ui.loading.0': 'Crafting voxels...',
    'ui.loading.1': 'Designing structure...',
    'ui.loading.2': 'Calculating physics...',
    'ui.loading.3': 'Mixing colors...',
    'ui.loading.4': 'Assembling geometry...',
    'ui.loading.5': 'Applying polish...',
    'ui.loading.title': 'Generating...',
    'ui.loading.progress': 'Received {lines} rows · {chars} chars',

    // ===== UIOverlay bottom controls =====
    'ui.button.generate_model': 'Generate Model',
    'ui.button.presets': 'Presets',
    'ui.preset.modern_sofa': 'Modern Sofa',
    'ui.preset.modern_lamp': 'Modern Lamp',
    'ui.preset.table': 'Table',
    'ui.model.soon': 'Soon',
    'ui.model.source': 'Source',

    // ===== Model source scope (settings) =====
    'settings.model_sources.tooltip': 'Model source scope',
    'settings.model_sources.short_label': 'Models',
    'settings.model_sources.title': 'Model sources',
    'settings.model_sources.hint': 'Controls which backends appear in the model menu and side-by-side comparison.',
    'settings.model_sources.google_only': 'Google only (Gemini)',
    'settings.model_sources.all_vendors': 'Gemini, DeepSeek, Geo3D & Mock',

    // ===== Validity badge =====
    'ui.validity.label': 'Validity',
    'ui.validity.tooltip': 'Validity Score · compliance with brick library, collision-free, structural stability, and topology constraints. {summary}',

    // ===== Language toggle =====
    'ui.lang.toggle_to_en': 'EN',
    'ui.lang.toggle_to_zh': '中',
    'ui.lang.tooltip': 'Switch language',

    // ===== ConstraintPanel chrome =====
    'constraint.panel.title': 'Constraint Validity',
    'constraint.panel.title_with_source': '{title}',
    'constraint.panel.voxel_only': 'Voxel-only',
    'constraint.panel.voxel_only.tooltip': 'Voxel-only mode: brick-level checks (library, brick collision) require brick-line input.',
    'constraint.panel.evaluating': 'Evaluating constraints…',
    'constraint.panel.checking': 'Checking…',
    'constraint.panel.pass': 'Pass',
    'constraint.panel.fail': 'Fail',
    'constraint.panel.rerun': 'Re-run check',
    'constraint.panel.highlight': 'Highlight overlapping bricks',
    'constraint.panel.unhighlight': 'Clear highlight',
    'constraint.panel.footer': 'Mirrors the hard-constraint reward used by GRPO training (brick library, collision-free, bounding volume, physical stability, topological integrity).',
    'constraint.panel.progress': 'Checking {current}/{total}: {name}',

    // ===== Constraint names =====
    'constraint.brick_library.name': 'Brick Library',
    'constraint.collision_free.name': 'Collision Free',
    'constraint.bounding_volume.name': 'Bounding Volume',
    'constraint.structural_stability.name': 'Structural Stability',
    'constraint.topological_integrity.name': 'Topological Integrity',
    'constraint.voxel_uniqueness.name': 'Voxel Uniqueness',
    'constraint.floor_compliance.name': 'Floor Compliance',
    'constraint.voxel_bounding_volume.name': 'Bounding Volume',

    // ===== Constraint detail templates =====
    'constraint.empty.detail': 'Nothing to evaluate.',
    'constraint.brick_library.detail': '{valid}/{total} bricks belong to the allowed library.',
    'constraint.collision_free.detail.ok': 'No overlapping bricks across {totalCells} occupied cells.',
    'constraint.collision_free.detail.fail': '{collisions} cell collisions detected.',
    'constraint.bounding_volume.detail': '{inside}/{total} bricks fit inside {maxX}×{maxY}×{maxLayers}.',
    'constraint.structural_stability.detail': '{supported}/{aboveGround} non-base voxels rest on a supporting voxel.',
    'constraint.structural_stability.detail.bricks': '{supported}/{aboveGround} non-base bricks rest on a supporting brick.',
    'constraint.structural_stability.detail.single_layer': 'Single-layer model — no support required.',
    'constraint.topological_integrity.detail.ok': 'Model is a single connected component.',
    'constraint.topological_integrity.detail.fail': 'Model splits into {components} disconnected fragments (largest = {largest} voxels).',
    'constraint.voxel_uniqueness.detail.ok': 'All {count} voxels occupy unique cells.',
    'constraint.voxel_uniqueness.detail.fail': '{duplicates} duplicate voxel coordinates detected.',
    'constraint.voxel_bounding_volume.detail': '{inside}/{total} voxels fit inside the {maxExtent}-unit envelope.',
    'constraint.floor_compliance.detail.ok': 'All voxels rest on or above the ground plane.',
    'constraint.floor_compliance.detail.fail': '{below} voxels sit below y=0.',

    // ===== Constraint violations =====
    'constraint.violation.invalid_brick': 'Invalid brick {size} at ({x},{y},{layer})',
    'constraint.violation.collision': 'Collision at ({x},{y},{layer})',
    'constraint.violation.brick_out_of_bounds': 'Brick {size} at ({x},{y},{layer}) leaves [0..{maxX}) × [0..{maxY}) × [0..{maxLayers})',
    'constraint.violation.floating_voxel': 'Floating voxel at ({x},{y},{z})',
    'constraint.violation.unsupported_brick': 'Unsupported brick {size} at ({x},{y},{layer})',
    'constraint.violation.disconnected': '{components} disconnected components',
    'constraint.violation.duplicate_voxel': 'Duplicate voxel at ({x},{y},{z})',
    'constraint.violation.voxel_out_of_bounds': 'Voxel out of bounds at ({x},{y},{z})',
    'constraint.violation.below_floor': 'Voxel below floor at ({x},{y},{z})',

    // ===== Constraint summary =====
    'constraint.summary': '{passed}/{total} constraints passed (Validity {validity}).',

    // ===== MetricsPanel =====
    'metrics.title': 'Evaluation Metrics',
    'metrics.help_aria': 'Explain each metric',
    'metrics.guide_title': 'Metric Guide',
    'metrics.judge_guide_title': 'LLM Judge Guide',
    'metrics.judge_axes_title': 'LLM Judge Axes',
    'metrics.column.metric': 'Metric',
    'metrics.column.left': 'Left',
    'metrics.column.right': 'Right',
    'metrics.judge_title': 'LLM Judge Scores',

    // Metric names + meanings + better-direction
    'metric.voxel_count': 'Voxel Count',
    'metric.voxel_count.meaning': 'The total number of voxels used in the model. It mainly reflects scale and detail density.',
    'metric.voxel_count.better': 'Contextual',
    'metric.connectivity': 'Connectivity',
    'metric.connectivity.meaning': 'How many separate voxel components exist. A value of 1 means the model is fully connected.',
    'metric.connectivity.better': 'Lower is better',
    'metric.symmetry': 'Symmetry',
    'metric.symmetry.meaning': 'Mirror consistency across the x-axis. Higher values mean the left and right halves align more closely.',
    'metric.symmetry.better': 'Higher is better',
    'metric.color_diversity': 'Color Diversity',
    'metric.color_diversity.meaning': 'The number of distinct colors used. Higher values usually indicate a richer palette.',
    'metric.color_diversity.better': 'Higher is better',
    'metric.hsl_variance': 'HSL Variance',
    'metric.hsl_variance.meaning': 'How much the hue, saturation, and lightness vary across the palette. Higher values mean more tonal spread.',
    'metric.hsl_variance.better': 'Higher is better',
    'metric.centering_error': 'Centering Error',
    'metric.centering_error.meaning': 'Distance from the model center to x=0, z=0. Lower values mean the asset is better centered in the scene.',
    'metric.centering_error.better': 'Lower is better',
    'metric.surface_ratio': 'Surface Ratio',
    'metric.surface_ratio.meaning': 'Share of voxel faces exposed to the outside. Higher values often indicate less solid mass and more visible shape detail.',
    'metric.surface_ratio.better': 'Higher is usually better',
    'metric.floor_ok': 'Floor OK',
    'metric.floor_ok.meaning': 'Checks whether the model sits on or above the ground plane without dipping below the expected floor.',
    'metric.floor_ok.better': '1 is better',

    // Judge axes
    'judge.prompt': 'Prompt',
    'judge.prompt.meaning': 'How well the generated structure matches the requested object or concept.',
    'judge.structure': 'Structure',
    'judge.structure.meaning': 'How plausible, stable, and physically connected the voxel form appears.',
    'judge.aesthetic': 'Aesthetic',
    'judge.aesthetic.meaning': 'How well the proportions, silhouette, and color choices work visually.',
    'judge.creative': 'Creative',
    'judge.creative.meaning': 'How original or interesting the output feels beyond a plain baseline solution.',

    // ===== PromptModal =====
    'prompt.title': 'What should we build?',
    'prompt.placeholder': 'e.g., A futuristic spaceship, a cute cat, a medieval castle...',
    'prompt.api_key.gemini.placeholder': 'Paste Gemini API key (stored locally in this browser)',
    'prompt.api_key.deepseek.placeholder': 'Paste DeepSeek API key (stored locally in this browser)',
    'prompt.api_key.generic.placeholder': 'Paste API key (stored locally in this browser)',
    'prompt.submit': 'Generate',
    'prompt.generating': 'Generating...',

    // ===== JsonModal =====
    'json.title': 'Model Blueprint',
    'json.subtitle': 'JSON Format',
    'json.copy': 'Copy',
    'json.copied': 'Copied!',
    'json.close': 'Close',
    'json.brick_lines': 'Brick Lines',
    'json.voxel_json': 'Voxel JSON',

    // ===== WelcomeScreen =====
    'welcome.message': 'Welcome to experience the magic of Voxels.',

    // ===== ComparisonView =====
    'compare.exit': 'Exit',
    'compare.title': 'COMPARISON MODE',
    'compare.prompt_placeholder': 'Describe what to generate…',
    'compare.generate_both': 'Generate Both',
    'compare.metrics': 'Metrics',
    'compare.linked_views': 'Linked Views',
    'compare.free_views': 'Free Views',
    'compare.linked_views.tooltip': 'Linked views: right viewport follows the left viewport camera.',
    'compare.free_views.tooltip': 'Free views: each viewport can be panned and rotated independently.',
    'compare.reset': 'Reset',
    'compare.reset.tooltip.left': 'Reset the left viewport camera to the default view.',
    'compare.reset.tooltip.right': 'Reset the right viewport camera to the default view.',
    'compare.reset.tooltip.linked': 'Reset both linked viewports to the default camera.',
    'compare.live_eval': 'LIVE EVALUATION',
    'compare.live_eval.subtitle': 'Metrics are docked to the side so the 3D models stay fully visible.',
    'compare.generating': 'Generating…',
    'compare.source.tooltip': 'Choose the generation source for this viewport.',
    'compare.left.label': 'Left',
    'compare.right.label': 'Right',

    // ===== EvalHistory =====
    'history.title': 'Eval History',
    'history.export.json': 'JSON',
    'history.export.csv': 'CSV',
    'history.clear': 'Clear',
    'history.clear.confirm': 'Clear all evaluation history?',
    'history.empty': 'No history yet.',
    'history.subtitle': '{count} voxels · {ms}ms',
    'history.load.left': 'Left',
    'history.load.right': 'Right',

    // ===== Benchmark picker =====
    'benchmark.title': 'Geo3D GRPO Benchmark',
    'benchmark.subtitle': '{total} prompts from the GRPO test set',
    'benchmark.search': 'Search prompt…',
    'benchmark.load.left': 'Load Left',
    'benchmark.load.right': 'Load Right',
    'benchmark.empty': 'No prompts match the search.',
    'benchmark.loading': 'Loading benchmarks…',
    'benchmark.error': 'Failed to load benchmark data: {message}',
    'benchmark.retry': 'Retry',
    'benchmark.score.validity': 'Validity {score}',
    'benchmark.score.voxel': 'Voxel {score}',
    'benchmark.score.bricks': '{count} bricks',
    'benchmark.no_match_alert': 'No GRPO benchmark exists for this prompt. Open the Benchmark picker to choose one.',

    // ===== Color panel =====
    'color.panel.title': 'Coloring',
    'color.ai': 'AI Color',
    'color.ai.pending': 'Coloring…',
    'color.ai.no_key': 'Need a {provider} API key to use AI coloring.',
    'color.ai.failed': 'AI coloring failed: {message}',
    'color.uniform': 'Uniform Color',
    'color.uniform.apply': 'Apply',
    'color.manual': 'Manual Paint',
    'color.manual.on': 'Painting',
    'color.manual.off': 'Off',
    'color.manual.hint': 'Click a brick in the viewport to paint it with the selected color.',
    'color.reset': 'Reset',
    'color.save': 'Save Preset',
    'color.icon.tooltip': 'Coloring',
  },

  zh: {
    // ===== App / source labels =====
    'app.source.preset': '预设 · {name}',
    'app.source.preset.modern_sofa': '预设 · 现代沙发',
    'app.source.preset.modern_lamp': '预设 · 现代台灯',
    'app.source.preset.table': '预设 · 桌子',
    'app.source.imported': '导入 · {file}',
    'app.source.gemini': 'Gemini · {model}',
    'app.source.deepseek': 'DeepSeek · {model}',
    'app.source.mock': '本地模拟生成',
    'app.alert.preset_saved': '预设保存成功！',
    'app.alert.preset_save_failed': '预设保存失败。',
    'app.alert.preset_name_prompt': '请输入预设名称：',
    'app.alert.preset_default_name': '预设 {n}',
    'app.alert.missing_api_key.gemini': '缺少 API 密钥。请在弹窗中粘贴你的 Gemini API key。',
    'app.alert.missing_api_key.deepseek': '缺少 API 密钥。请在弹窗中粘贴你的 DeepSeek API key。',
    'app.alert.import_failed': '导入失败：{message}',
    'app.alert.generation_failed': '生成失败：{message}',

    // ===== UIOverlay top header / icons =====
    'ui.brand.title': '体素 AI',
    'ui.brand.subtitle': '生成器',
    'ui.count': '数量',
    'ui.icon.info': '信息',
    'ui.icon.pause': '暂停',
    'ui.icon.play': '播放',
    'ui.icon.code': '代码',
    'ui.icon.import': '导入',
    'ui.icon.save_preset': '保存预设',
    'ui.icon.compare': '对比',
    'ui.icon.constraints': '约束面板',
    'ui.icon.benchmark': '数据集',

    // ===== UIOverlay loading messages =====
    'ui.loading.0': '正在搭建体素…',
    'ui.loading.1': '正在设计结构…',
    'ui.loading.2': '正在计算物理…',
    'ui.loading.3': '正在调配色彩…',
    'ui.loading.4': '正在拼装几何…',
    'ui.loading.5': '正在最后润色…',
    'ui.loading.title': '生成中…',
    'ui.loading.progress': '已接收 {lines} 行 · {chars} 字符',

    // ===== UIOverlay bottom controls =====
    'ui.button.generate_model': '生成模型',
    'ui.button.presets': '预设',
    'ui.preset.modern_sofa': '现代沙发',
    'ui.preset.modern_lamp': '现代台灯',
    'ui.preset.table': '桌子',
    'ui.model.soon': '即将上线',
    'ui.model.source': '生成来源',

    // ===== Model source scope (settings) =====
    'settings.model_sources.tooltip': '模型来源范围',
    'settings.model_sources.short_label': '模型',
    'settings.model_sources.title': '模型来源',
    'settings.model_sources.hint': '控制底部模型菜单与对比视图中展示的生成后端。',
    'settings.model_sources.google_only': '仅 Google（Gemini）',
    'settings.model_sources.all_vendors': 'Gemini、DeepSeek、Geo3D 与 Mock',

    // ===== Validity badge =====
    'ui.validity.label': '合规分',
    'ui.validity.tooltip': '合规分 · 反映砖块库合规、无碰撞、结构稳定、拓扑完整等硬约束的综合达标度。{summary}',

    // ===== Language toggle =====
    'ui.lang.toggle_to_en': 'EN',
    'ui.lang.toggle_to_zh': '中',
    'ui.lang.tooltip': '切换语言',

    // ===== ConstraintPanel chrome =====
    'constraint.panel.title': '约束合规检测',
    'constraint.panel.title_with_source': '{title}',
    'constraint.panel.voxel_only': '仅体素',
    'constraint.panel.voxel_only.tooltip': '当前为仅体素模式：砖块级别检查（砖块库、砖块碰撞）需要原始 brick-line 输入。',
    'constraint.panel.evaluating': '正在评估约束…',
    'constraint.panel.checking': '检测中…',
    'constraint.panel.pass': '通过',
    'constraint.panel.fail': '未通过',
    'constraint.panel.rerun': '重新检测',
    'constraint.panel.highlight': '高亮重叠砖块',
    'constraint.panel.unhighlight': '取消高亮',
    'constraint.panel.footer': '此模块对应 GRPO 训练奖励中的硬约束（砖块库合规、无碰撞、包围盒、物理稳定性、拓扑完整性）。',
    'constraint.panel.progress': '正在检测 {current}/{total}：{name}',

    // ===== Constraint names =====
    'constraint.brick_library.name': '砖块库合规',
    'constraint.collision_free.name': '无碰撞',
    'constraint.bounding_volume.name': '包围盒合规',
    'constraint.structural_stability.name': '结构稳定性',
    'constraint.topological_integrity.name': '拓扑完整性',
    'constraint.voxel_uniqueness.name': '体素唯一性',
    'constraint.floor_compliance.name': '地面合规',
    'constraint.voxel_bounding_volume.name': '包围盒合规',

    // ===== Constraint detail templates =====
    'constraint.empty.detail': '暂无可评估的内容。',
    'constraint.brick_library.detail': '{valid}/{total} 块砖在允许的砖块库中。',
    'constraint.collision_free.detail.ok': '{totalCells} 个占用格子内未发现砖块重叠。',
    'constraint.collision_free.detail.fail': '检测到 {collisions} 处格子重叠。',
    'constraint.bounding_volume.detail': '{inside}/{total} 块砖位于 {maxX}×{maxY}×{maxLayers} 包围盒内。',
    'constraint.structural_stability.detail': '{supported}/{aboveGround} 个非底层体素下方有支撑。',
    'constraint.structural_stability.detail.bricks': '{supported}/{aboveGround} 块非底层砖块下方有支撑。',
    'constraint.structural_stability.detail.single_layer': '单层模型，无需支撑。',
    'constraint.topological_integrity.detail.ok': '模型为单一连通体。',
    'constraint.topological_integrity.detail.fail': '模型包含 {components} 个独立碎片（最大连通分量 {largest} 个体素）。',
    'constraint.voxel_uniqueness.detail.ok': '全部 {count} 个体素位于唯一格子。',
    'constraint.voxel_uniqueness.detail.fail': '检测到 {duplicates} 个重复体素坐标。',
    'constraint.voxel_bounding_volume.detail': '{inside}/{total} 个体素位于 {maxExtent} 单位的包围盒内。',
    'constraint.floor_compliance.detail.ok': '所有体素均位于地面或之上。',
    'constraint.floor_compliance.detail.fail': '有 {below} 个体素低于 y=0。',

    // ===== Constraint violations =====
    'constraint.violation.invalid_brick': '非法砖块 {size}，位置 ({x},{y},{layer})',
    'constraint.violation.collision': '碰撞位置 ({x},{y},{layer})',
    'constraint.violation.brick_out_of_bounds': '砖块 {size} 在 ({x},{y},{layer}) 越出 [0..{maxX}) × [0..{maxY}) × [0..{maxLayers})',
    'constraint.violation.floating_voxel': '悬浮体素 ({x},{y},{z})',
    'constraint.violation.unsupported_brick': '无支撑砖块 {size} 位于 ({x},{y},{layer})',
    'constraint.violation.disconnected': '{components} 个独立连通分量',
    'constraint.violation.duplicate_voxel': '重复体素 ({x},{y},{z})',
    'constraint.violation.voxel_out_of_bounds': '体素越界 ({x},{y},{z})',
    'constraint.violation.below_floor': '体素低于地面 ({x},{y},{z})',

    // ===== Constraint summary =====
    'constraint.summary': '{passed}/{total} 项约束通过（合规分 {validity}）。',

    // ===== MetricsPanel =====
    'metrics.title': '评估指标',
    'metrics.help_aria': '查看各指标说明',
    'metrics.guide_title': '指标说明',
    'metrics.judge_guide_title': 'LLM 评审说明',
    'metrics.judge_axes_title': 'LLM 评审维度',
    'metrics.column.metric': '指标',
    'metrics.column.left': '左侧',
    'metrics.column.right': '右侧',
    'metrics.judge_title': 'LLM 评审分数',

    // Metric names + meanings + better-direction
    'metric.voxel_count': '体素数量',
    'metric.voxel_count.meaning': '模型使用的体素总数，反映体量与细节密度。',
    'metric.voxel_count.better': '视场景而定',
    'metric.connectivity': '连通性',
    'metric.connectivity.meaning': '体素被划分为多少个独立连通分量。值为 1 表示模型完全连通。',
    'metric.connectivity.better': '越低越好',
    'metric.symmetry': '对称性',
    'metric.symmetry.meaning': '沿 x 轴的镜像一致性。值越高表示左右两侧对齐越好。',
    'metric.symmetry.better': '越高越好',
    'metric.color_diversity': '色彩多样性',
    'metric.color_diversity.meaning': '使用的不同颜色数量。值越高通常代表调色板越丰富。',
    'metric.color_diversity.better': '越高越好',
    'metric.hsl_variance': 'HSL 方差',
    'metric.hsl_variance.meaning': '色相、饱和度、亮度在调色板上的变化幅度。值越高色彩跨度越大。',
    'metric.hsl_variance.better': '越高越好',
    'metric.centering_error': '居中误差',
    'metric.centering_error.meaning': '模型重心到 (x=0, z=0) 的距离。值越低表示资产在场景中越居中。',
    'metric.centering_error.better': '越低越好',
    'metric.surface_ratio': '表面占比',
    'metric.surface_ratio.meaning': '暴露在外侧的体素面占总面数的比例。值越高通常意味着体量更通透、形态更分明。',
    'metric.surface_ratio.better': '通常越高越好',
    'metric.floor_ok': '地面合规',
    'metric.floor_ok.meaning': '检查模型是否完整位于地面或之上，未陷入地表以下。',
    'metric.floor_ok.better': '1 表示通过',

    // Judge axes
    'judge.prompt': '提示匹配',
    'judge.prompt.meaning': '生成结构与所请求的物体或概念的契合度。',
    'judge.structure': '结构合理',
    'judge.structure.meaning': '体素形态在物理上是否合理、稳定、相互连接。',
    'judge.aesthetic': '美学',
    'judge.aesthetic.meaning': '比例、轮廓与配色在视觉上的和谐度。',
    'judge.creative': '创意',
    'judge.creative.meaning': '相对于平庸方案的原创性与趣味性。',

    // ===== PromptModal =====
    'prompt.title': '想要搭建什么？',
    'prompt.placeholder': '例如：未来感飞船、可爱的猫、中世纪城堡……',
    'prompt.api_key.gemini.placeholder': '粘贴 Gemini API key（仅保存在本浏览器）',
    'prompt.api_key.deepseek.placeholder': '粘贴 DeepSeek API key（仅保存在本浏览器）',
    'prompt.api_key.generic.placeholder': '粘贴 API key（仅保存在本浏览器）',
    'prompt.submit': '开始生成',
    'prompt.generating': '生成中…',

    // ===== JsonModal =====
    'json.title': '模型蓝图',
    'json.subtitle': 'JSON 格式',
    'json.copy': '复制',
    'json.copied': '已复制！',
    'json.close': '关闭',
    'json.brick_lines': '砖块行',
    'json.voxel_json': '体素 JSON',

    // ===== WelcomeScreen =====
    'welcome.message': '欢迎体验体素世界的奇妙。',

    // ===== ComparisonView =====
    'compare.exit': '退出',
    'compare.title': '对比模式',
    'compare.prompt_placeholder': '描述要生成的内容…',
    'compare.generate_both': '同时生成',
    'compare.metrics': '指标',
    'compare.linked_views': '联动视角',
    'compare.free_views': '自由视角',
    'compare.linked_views.tooltip': '联动视角：右侧视口跟随左侧相机。',
    'compare.free_views.tooltip': '自由视角：两侧视口可独立平移与旋转。',
    'compare.reset': '重置',
    'compare.reset.tooltip.left': '把左侧视口重置回默认相机。',
    'compare.reset.tooltip.right': '把右侧视口重置回默认相机。',
    'compare.reset.tooltip.linked': '把两个联动视口都重置回默认相机。',
    'compare.live_eval': '实时评估',
    'compare.live_eval.subtitle': '指标停靠在侧栏，让 3D 模型保持完整可见。',
    'compare.generating': '生成中…',
    'compare.source.tooltip': '选择该视口的生成来源。',
    'compare.left.label': '左',
    'compare.right.label': '右',

    // ===== EvalHistory =====
    'history.title': '评估历史',
    'history.export.json': 'JSON',
    'history.export.csv': 'CSV',
    'history.clear': '清空',
    'history.clear.confirm': '确定要清空全部评估历史吗？',
    'history.empty': '暂无历史记录。',
    'history.subtitle': '{count} 体素 · {ms}ms',
    'history.load.left': '左',
    'history.load.right': '右',

    // ===== Benchmark picker =====
    'benchmark.title': 'Geo3D GRPO 基准集',
    'benchmark.subtitle': '共 {total} 条来自 GRPO 测试集的 prompt',
    'benchmark.search': '搜索 prompt…',
    'benchmark.load.left': '加载到左',
    'benchmark.load.right': '加载到右',
    'benchmark.empty': '没有匹配的 prompt。',
    'benchmark.loading': '正在加载基准数据集…',
    'benchmark.error': '加载基准数据失败：{message}',
    'benchmark.retry': '重试',
    'benchmark.score.validity': '合规分 {score}',
    'benchmark.score.voxel': '体素分 {score}',
    'benchmark.score.bricks': '{count} 块砖',
    'benchmark.no_match_alert': '该 prompt 不在 GRPO 基准集中。请通过数据集面板挑选一个 prompt。',

    // ===== 着色面板 =====
    'color.panel.title': '着色',
    'color.ai': 'AI 着色',
    'color.ai.pending': '着色中…',
    'color.ai.no_key': '需要 {provider} 的 API key 才能使用 AI 着色。',
    'color.ai.failed': 'AI 着色失败：{message}',
    'color.uniform': '统一上色',
    'color.uniform.apply': '应用',
    'color.manual': '手动涂色',
    'color.manual.on': '涂色中',
    'color.manual.off': '关闭',
    'color.manual.hint': '在视口里点击某块砖，将其涂为选中颜色。',
    'color.reset': '重置',
    'color.save': '保存预设',
    'color.icon.tooltip': '着色',
  },
};

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v == null ? `{${k}}` : String(v);
  });
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.en;
  const tpl = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  return interpolate(tpl, params);
}

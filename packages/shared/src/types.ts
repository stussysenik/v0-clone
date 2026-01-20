// =============================================================================
// Core Pipeline Types
// =============================================================================

export type PipelineStage = 'input' | 'parse' | 'generate' | 'validate' | 'render'

export interface PipelineEvent {
	stage: PipelineStage
	status: 'started' | 'completed' | 'error'
	timestamp: number
	durationMs?: number
	data?: unknown
	error?: Error
}

export interface PipelineMetrics {
	totalDurationMs: number
	stages: Record<PipelineStage, { durationMs: number; startedAt: number; completedAt: number }>
}

export interface PipelineInput {
	type: 'markdown' | 'prompt' | 'image' | 'file'
	content: string
	metadata?: Record<string, unknown>
}

export interface PipelineOutput {
	code: string
	html: string
	css?: string
	sourceMap?: Record<string, string> // data-oid -> source location
	metrics: PipelineMetrics
	validation?: ValidationResult
}

// =============================================================================
// LLM Provider Types
// =============================================================================

export type LLMProvider = 'claude' | 'openai' | 'ollama' | 'zhipu' | 'lmstudio' | 'custom'

export interface LLMConfig {
	provider: LLMProvider
	model: string
	apiKey?: string
	baseUrl?: string
	maxTokens?: number
	temperature?: number
}

// =============================================================================
// Model Configuration (009 - Model Selection UI)
// =============================================================================

export interface ModelOption {
	id: string
	name: string
	description?: string
	contextWindow?: number
	maxOutput?: number
	free?: boolean
}

export interface ProviderConfig {
	id: LLMProvider
	name: string
	description: string
	requiresApiKey: boolean
	requiresBaseUrl: boolean
	apiKeyEnvVar?: string
	baseUrlEnvVar?: string
	defaultBaseUrl?: string
	models: ModelOption[]
}

export const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
	zhipu: {
		id: 'zhipu',
		name: 'Zhipu AI (GLM)',
		description: 'Chinese AI lab with GLM-4 series models',
		requiresApiKey: true,
		requiresBaseUrl: true,
		apiKeyEnvVar: 'ZHIPU_API_KEY',
		baseUrlEnvVar: 'ZHIPU_BASE_URL',
		defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
		models: [
			{ id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', description: 'Fast and affordable', contextWindow: 200000, maxOutput: 128000, free: false },
			{ id: 'glm-4.7', name: 'GLM-4.7', description: 'Flagship model for coding', contextWindow: 200000, maxOutput: 128000, free: false },
			{ id: 'glm-4', name: 'GLM-4', description: 'Standard model', contextWindow: 128000, maxOutput: 4096, free: false },
		],
	},
	claude: {
		id: 'claude',
		name: 'Anthropic Claude',
		description: 'Claude models from Anthropic',
		requiresApiKey: true,
		requiresBaseUrl: false,
		apiKeyEnvVar: 'ANTHROPIC_API_KEY',
		models: [
			{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Best balance of speed and quality', contextWindow: 200000, maxOutput: 8192 },
			{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Previous generation', contextWindow: 200000, maxOutput: 8192 },
			{ id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and affordable', contextWindow: 200000, maxOutput: 8192 },
		],
	},
	openai: {
		id: 'openai',
		name: 'OpenAI',
		description: 'GPT models from OpenAI',
		requiresApiKey: true,
		requiresBaseUrl: false,
		apiKeyEnvVar: 'OPENAI_API_KEY',
		models: [
			{ id: 'gpt-4o', name: 'GPT-4o', description: 'Latest multimodal model', contextWindow: 128000, maxOutput: 16384 },
			{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster and cheaper', contextWindow: 128000, maxOutput: 16384 },
			{ id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation', contextWindow: 128000, maxOutput: 4096 },
		],
	},
	ollama: {
		id: 'ollama',
		name: 'Ollama (Local)',
		description: 'Run models locally with Ollama',
		requiresApiKey: false,
		requiresBaseUrl: true,
		baseUrlEnvVar: 'OLLAMA_BASE_URL',
		defaultBaseUrl: 'http://localhost:11434',
		models: [
			{ id: 'codellama:13b', name: 'CodeLlama 13B', description: 'Optimized for code', contextWindow: 16384, free: true },
			{ id: 'llama3.2:latest', name: 'Llama 3.2', description: 'General purpose', contextWindow: 8192, free: true },
			{ id: 'deepseek-coder:6.7b', name: 'DeepSeek Coder 6.7B', description: 'Code generation', contextWindow: 16384, free: true },
		],
	},
	lmstudio: {
		id: 'lmstudio',
		name: 'LM Studio (Local)',
		description: 'Run models locally with LM Studio',
		requiresApiKey: false,
		requiresBaseUrl: true,
		baseUrlEnvVar: 'LMSTUDIO_BASE_URL',
		defaultBaseUrl: 'http://localhost:1234/v1',
		models: [
			{ id: 'devstral-small-2', name: 'Devstral Small', description: 'Code-focused model', free: true },
			{ id: 'loaded-model', name: 'Currently Loaded Model', description: 'Uses whatever model is loaded in LM Studio', free: true },
		],
	},
	custom: {
		id: 'custom',
		name: 'Custom Provider',
		description: 'Use a custom OpenAI-compatible API',
		requiresApiKey: true,
		requiresBaseUrl: true,
		models: [
			{ id: 'custom', name: 'Custom Model', description: 'Specify model ID manually' },
		],
	},
}

export interface StudioSettings {
	provider: LLMProvider
	model: string
	apiKey?: string
	baseUrl?: string
	temperature: number
	maxTokens: number
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface LLMStreamChunk {
	content: string
	done: boolean
	usage?: {
		promptTokens: number
		completionTokens: number
	}
}

export interface LLMResponse {
	content: string
	usage?: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
	}
	durationMs: number
}

export interface HealthCheckResult {
	ok: boolean
	error?: string
	latencyMs: number
	details?: Record<string, unknown>
}

export interface LLMProviderInterface {
	name: LLMProvider
	generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse>
	stream(
		messages: LLMMessage[],
		config?: Partial<LLMConfig>,
	): AsyncGenerator<LLMStreamChunk, void, unknown>
	testConnection(): Promise<HealthCheckResult>
}

// =============================================================================
// Preview / Renderer Types
// =============================================================================

export interface PreviewMessage {
	type: 'render' | 'update' | 'error' | 'ready' | 'metrics'
	payload: unknown
	timestamp: number
}

export interface RenderPayload {
	html: string
	css?: string
	js?: string
	sourceMap?: Record<string, string>
}

export interface PreviewMetrics {
	renderTimeMs: number
	domNodes: number
	layoutShifts: number
	firstPaintMs?: number
}

// =============================================================================
// Studio / UI Types
// =============================================================================

export type StudioState = 'idle' | 'loading' | 'rendering' | 'error' | 'generating'

export interface StudioFile {
	name: string
	path: string
	type: 'markdown' | 'image' | 'json' | 'unknown'
	content: string | ArrayBuffer
	lastModified: number
}

export interface DevTelemetry {
	enabled: boolean
	events: TelemetryEvent[]
	metrics: {
		pipelineRuns: number
		avgGenerationMs: number
		avgRenderMs: number
		errorCount: number
	}
}

export interface TelemetryEvent {
	type: 'pipeline' | 'llm' | 'render' | 'websocket' | 'error'
	timestamp: number
	durationMs?: number
	data: Record<string, unknown>
}

// =============================================================================
// WebSocket / Real-time Types
// =============================================================================

export interface WSMessage {
	type: 'file_change' | 'generate' | 'preview_update' | 'error' | 'telemetry'
	payload: unknown
	timestamp: number
	id: string
}

export interface WSConnectionState {
	connected: boolean
	reconnecting: boolean
	lastPing?: number
	latencyMs?: number
}

// =============================================================================
// Animation Types
// =============================================================================

export interface AnimationConfig {
	duration: number
	easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring'
	delay?: number
	stiffness?: number // for spring
	damping?: number // for spring
}

export interface TransitionState {
	entering: boolean
	leaving: boolean
	active: boolean
}

// =============================================================================
// Memory & Session Types (005)
// =============================================================================

export interface GenerationSession {
	id: string
	createdAt: number
	prompt: string
	generatedCode: string
	renderedHtml: string
	metadata: {
		provider: string
		model: string
		duration: {
			parse: number
			generate: number
			render: number
			total: number
		}
		tokenUsage?: {
			prompt: number
			completion: number
		}
	}
}

export interface GenerationCheckpoint {
	id: string
	sessionId: string
	stage: 'parse' | 'generate' | 'render'
	timestamp: number
	data: {
		input: unknown
		output: unknown
		partialCode?: string
	}
}

export type TelemetryEventType = 'pipeline' | 'llm' | 'render' | 'websocket' | 'error' | 'user' | 'checkpoint'

// =============================================================================
// Conversation Session Types (008 - Persistent Conversations)
// =============================================================================

export interface ConversationMessage {
	id: string
	role: 'user' | 'assistant' | 'system'
	content: string
	timestamp: number
	generationId?: string // Links to a generation snapshot
}

export interface ConversationSession {
	id: string
	projectId?: string
	name: string
	messages: ConversationMessage[]
	generations: string[] // Snapshot IDs from Chronicle
	createdAt: number
	updatedAt: number
	archived: boolean
	metadata?: {
		lastPrompt?: string
		lastGeneratedCode?: string
		intent?: string
	}
}

// =============================================================================
// Aesthetic Curation Types (007)
// =============================================================================

export type AestheticCategory = 'form' | 'expression' | 'refinement' | 'color'

export interface AestheticDimension {
	id: string
	category: AestheticCategory
	name: string
	description: string
	min: string
	max: string
	value: number
	weight: number
}

export interface AestheticPreset {
	id: string
	name: string
	description: string
	values: Record<string, number>
	tags: string[]
}

export interface AestheticProfile {
	dimensions: AestheticDimension[]
	activePreset?: string
	customizations: Record<string, number>
}

// =============================================================================
// Editor Settings Types (006)
// =============================================================================

export interface EditorSettings {
	fontSize: 12 | 14 | 16 | 18
	lineHeight: 1.4 | 1.6 | 1.8
	showLineNumbers: boolean
	wordWrap: boolean
	showMinimap: boolean
	tabSize: 2 | 4
	theme: string
}

// =============================================================================
// Visual Precision Types (009 - Bedrock Precision Engine)
// =============================================================================

export type GridRatio = '4pt' | '6pt' | '8pt' | '12pt' | 'golden' | 'custom'

export interface GridConfig {
	ratio: GridRatio
	customSize?: number
	showSubdivisions: boolean
	subdivisionCount: 2 | 4 | 8
	color: string
	opacity: number
	showCenterLines: boolean
}

export type TypographyScaleType =
	| 'minor-second'    // 1.067
	| 'major-second'    // 1.125
	| 'minor-third'     // 1.200
	| 'major-third'     // 1.250
	| 'perfect-fourth'  // 1.333
	| 'perfect-fifth'   // 1.500
	| 'golden-ratio'    // 1.618

export interface TypographyScale {
	type: TypographyScaleType
	baseSize: number  // in px
	levels: number    // how many levels up/down from base
}

export const TYPOGRAPHY_SCALE_RATIOS: Record<TypographyScaleType, number> = {
	'minor-second': 1.067,
	'major-second': 1.125,
	'minor-third': 1.200,
	'major-third': 1.250,
	'perfect-fourth': 1.333,
	'perfect-fifth': 1.500,
	'golden-ratio': 1.618,
}

export const GRID_SIZES: Record<Exclude<GridRatio, 'custom'>, number> = {
	'4pt': 4,
	'6pt': 6,
	'8pt': 8,
	'12pt': 12,
	'golden': 8.09, // Golden ratio base unit (5 * 1.618)
}

export interface BaselineRhythmConfig {
	enabled: boolean
	unit: 4 | 8
	showLines: boolean
	highlightViolations: boolean
}

export interface ConstraintVisualization {
	showFlexbox: boolean
	showGrid: boolean
	showMargins: boolean
	showPadding: boolean
	showGaps: boolean
}

export interface ElementMeasurement {
	element: string  // selector or element identifier
	width: number
	height: number
	x: number
	y: number
	computedStyles: {
		display: string
		flexDirection?: string
		gridTemplateColumns?: string
		gap?: string
		margin: string
		padding: string
	}
}

// =============================================================================
// Validation Types (009 - Bedrock Precision Engine)
// =============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
	type: 'deprecated' | 'compat' | 'semantic' | 'a11y' | 'performance'
	severity: ValidationSeverity
	message: string
	line?: number
	column?: number
	rule: string
	suggestion?: string
	mdnUrl?: string
}

export interface ValidationResult {
	valid: boolean
	score: number  // 0-100
	issues: ValidationIssue[]
	summary: {
		errors: number
		warnings: number
		infos: number
	}
}

export interface BrowserSupport {
	chrome: number | null
	firefox: number | null
	safari: number | null
	edge: number | null
	ie: number | null
}

export interface CSSPropertyCompat {
	property: string
	standard: boolean
	deprecated: boolean
	experimental: boolean
	support: BrowserSupport
	alternatives?: string[]
}

// =============================================================================
// Performance Types (009 - Bedrock Precision Engine)
// =============================================================================

export interface CoreWebVitals {
	lcp: number | null  // Largest Contentful Paint (ms)
	fid: number | null  // First Input Delay (ms) - deprecated, use INP
	inp: number | null  // Interaction to Next Paint (ms)
	cls: number | null  // Cumulative Layout Shift (score)
	fcp: number | null  // First Contentful Paint (ms)
	ttfb: number | null // Time to First Byte (ms)
}

export interface PerformanceAuditResult {
	score: number  // 0-100
	cwv: CoreWebVitals
	bundleSize: {
		html: number
		css: number
		js: number
		total: number
	}
	recommendations: PerformanceRecommendation[]
	passesThreshold: boolean  // >= 98
}

export interface PerformanceRecommendation {
	category: 'lcp' | 'cls' | 'inp' | 'bundle' | 'assets' | 'fonts'
	severity: ValidationSeverity
	message: string
	impact: 'high' | 'medium' | 'low'
	suggestion: string
}

export interface PerformanceThresholds {
	lighthouseScore: number  // default 98
	lcp: number              // default 1200ms
	cls: number              // default 0.1
	inp: number              // default 200ms
	maxBundleKb: number      // default 50
}

// =============================================================================
// SEO Types (009 - Bedrock Precision Engine)
// =============================================================================

export interface JsonLdSchema {
	'@context': 'https://schema.org'
	'@type': string
	[key: string]: unknown
}

export interface SEOMetadata {
	title?: string
	description?: string
	keywords?: string[]
	author?: string
	canonical?: string
	robots?: string
	openGraph?: {
		title?: string
		description?: string
		image?: string
		url?: string
		type?: string
		siteName?: string
		locale?: string
	}
	twitter?: {
		card?: 'summary' | 'summary_large_image'
		site?: string
		creator?: string
		title?: string
		description?: string
		image?: string
	}
	jsonLd?: JsonLdSchema[]
}

export interface SEOAuditResult {
	score: number
	issues: ValidationIssue[]
	metadata: SEOMetadata
	structuredData: {
		present: boolean
		valid: boolean
		types: string[]
	}
}

export interface SEOEnhancementResult {
	metadata: SEOMetadata
	injectedTags: number
	jsonLdTypes: string[]
	warnings: string[]
}

// =============================================================================
// Figma Design Token Types (Phase 3 - Figma MCP Integration)
// =============================================================================

export interface FigmaColor {
	name: string
	value: string // hex or rgba
	opacity?: number
	description?: string
}

export interface FigmaSpacing {
	name: string
	value: number
	unit: 'px' | 'rem' | 'em'
}

export interface FigmaTypography {
	name: string
	fontFamily: string
	fontSize: number
	fontWeight: number
	lineHeight: number | string
	letterSpacing?: number
	textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
}

export interface FigmaShadow {
	name: string
	x: number
	y: number
	blur: number
	spread: number
	color: string
}

export interface FigmaBorderRadius {
	name: string
	value: number
}

export interface FigmaDesignTokens {
	// Colors
	colors: {
		primary: Record<string, FigmaColor>
		secondary: Record<string, FigmaColor>
		neutral: Record<string, FigmaColor>
		semantic: Record<string, FigmaColor> // success, error, warning, info
		custom: Record<string, FigmaColor>
	}

	// Spacing
	spacing: Record<string, FigmaSpacing>

	// Typography
	typography: {
		fontFamilies: string[]
		fontSizes: Record<string, number>
		fontWeights: Record<string, number>
		lineHeights: Record<string, number | string>
		textStyles: Record<string, FigmaTypography>
	}

	// Effects
	shadows: Record<string, FigmaShadow>
	borderRadii: Record<string, FigmaBorderRadius>

	// Breakpoints
	breakpoints: Record<string, number>

	// Source metadata
	source: {
		fileKey: string
		fileName: string
		extractedAt: number
		nodeIds?: string[]
	}
}

export interface FigmaImportResult {
	success: boolean
	tokens: FigmaDesignTokens | null
	warnings: string[]
	errors: string[]
	extractedComponents?: FigmaComponent[]
}

export interface FigmaComponent {
	id: string
	name: string
	description?: string
	type: 'COMPONENT' | 'COMPONENT_SET' | 'INSTANCE'
	properties?: Record<string, unknown>
	variants?: FigmaVariant[]
}

export interface FigmaVariant {
	name: string
	properties: Record<string, string>
}

export interface FigmaContext {
	tokens: FigmaDesignTokens | null
	components: FigmaComponent[]
	isLoaded: boolean
	lastUpdated: number | null
	sourceUrl: string | null
}

// CSS variable mapping from Figma tokens
export interface FigmaToCSSMapping {
	cssVariables: Record<string, string>
	tailwindConfig?: TailwindFigmaConfig
}

export interface TailwindFigmaConfig {
	colors: Record<string, string | Record<string, string>>
	spacing: Record<string, string>
	fontSize: Record<string, [string, { lineHeight: string }]>
	fontFamily: Record<string, string[]>
	borderRadius: Record<string, string>
	boxShadow: Record<string, string>
}

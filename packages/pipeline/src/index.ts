import {
	type PipelineEvent,
	type PipelineInput,
	type PipelineMetrics,
	type PipelineOutput,
	type PipelineStage,
	type RenderPayload,
	type ValidationResult,
	type FigmaDesignTokens,
	devLog,
	now,
	createId,
} from '@v0-clone/shared'
import { type LLMManager, getLLM } from '@v0-clone/llm'
import { parse, type ParsedInput } from './stages/parse'
import { generate, streamGenerate, type GeneratedOutput, type GenerateOptions } from './stages/generate'
import { render, type RenderConfig } from './stages/render'
import { validate, type ValidationConfig, type ValidationOutput, createValidationReport } from './stages/validate'
import { enhanceSEO, generateLlmsTxt, type SEOConfig, type SEOOutput } from './stages/seo-enhance'
import { auditPerformance, createPerformanceReport, type PerformanceAuditOutput } from './stages/perf-audit'

export { parse, type ParsedInput, type Intent } from './stages/parse'
export { generate, streamGenerate, type GeneratedOutput } from './stages/generate'
export { render, type RenderConfig } from './stages/render'
export { validate, type ValidationConfig, type ValidationOutput, createValidationReport } from './stages/validate'
export { enhanceSEO, generateLlmsTxt, type SEOConfig, type SEOOutput } from './stages/seo-enhance'
export { auditPerformance, createPerformanceReport, type PerformanceAuditOutput } from './stages/perf-audit'

// =============================================================================
// Pipeline Event Emitter
// =============================================================================

type PipelineListener = (event: PipelineEvent) => void

class PipelineEventEmitter {
	private listeners: Set<PipelineListener> = new Set()

	on(listener: PipelineListener): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	emit(event: PipelineEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event)
			} catch (err) {
				console.error('Pipeline event listener error:', err)
			}
		}
	}
}

// =============================================================================
// Pipeline Class
// =============================================================================

export interface PipelineConfig {
	validation?: Partial<ValidationConfig>
	skipValidation?: boolean
}

export interface PipelineRunOptions {
	figmaTokens?: FigmaDesignTokens | null
	targetFramework?: 'svelte' | 'react' | 'html'
}

export class Pipeline {
	private llm: LLMManager
	private events = new PipelineEventEmitter()
	private config: PipelineConfig
	private metrics: PipelineMetrics = {
		totalDurationMs: 0,
		stages: {
			input: { durationMs: 0, startedAt: 0, completedAt: 0 },
			parse: { durationMs: 0, startedAt: 0, completedAt: 0 },
			generate: { durationMs: 0, startedAt: 0, completedAt: 0 },
			validate: { durationMs: 0, startedAt: 0, completedAt: 0 },
			render: { durationMs: 0, startedAt: 0, completedAt: 0 },
		},
	}

	constructor(llm?: LLMManager, config?: PipelineConfig) {
		this.llm = llm ?? getLLM()
		this.config = config ?? {}
	}

	/**
	 * Subscribe to pipeline events
	 */
	onEvent(listener: PipelineListener): () => void {
		return this.events.on(listener)
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): PipelineMetrics {
		return { ...this.metrics }
	}

	/**
	 * Run the full pipeline synchronously
	 */
	async run(input: PipelineInput, options?: PipelineRunOptions): Promise<PipelineOutput> {
		const pipelineStart = now()
		const runId = createId()

		devLog('pipeline', `Pipeline run started [${runId}]`, { type: input.type, hasFigmaTokens: !!options?.figmaTokens })

		try {
			// Input stage
			this.emitStage('input', 'started')
			const inputStart = now()
			this.metrics.stages.input.startedAt = inputStart
			this.emitStage('input', 'completed', { durationMs: now() - inputStart })
			this.metrics.stages.input.completedAt = now()
			this.metrics.stages.input.durationMs = now() - inputStart

			// Parse stage
			this.emitStage('parse', 'started')
			const parseStart = now()
			this.metrics.stages.parse.startedAt = parseStart
			const parsed = await parse(input)
			const parseDuration = now() - parseStart
			this.emitStage('parse', 'completed', { durationMs: parseDuration, data: parsed.metadata })
			this.metrics.stages.parse.completedAt = now()
			this.metrics.stages.parse.durationMs = parseDuration

			// Generate stage
			this.emitStage('generate', 'started')
			const generateStart = now()
			this.metrics.stages.generate.startedAt = generateStart
			const generateOptions: GenerateOptions = {
				figmaTokens: options?.figmaTokens,
				targetFramework: options?.targetFramework,
			}
			const generated = await generate(parsed, this.llm, generateOptions)
			const generateDuration = now() - generateStart
			this.emitStage('generate', 'completed', { durationMs: generateDuration })
			this.metrics.stages.generate.completedAt = now()
			this.metrics.stages.generate.durationMs = generateDuration

			// Validate stage (optional)
			let validated: ValidationOutput = { ...generated, validation: { valid: true, score: 100, issues: [], summary: { errors: 0, warnings: 0, infos: 0 } } }
			if (!this.config.skipValidation) {
				this.emitStage('validate', 'started')
				const validateStart = now()
				this.metrics.stages.validate.startedAt = validateStart
				validated = await validate(generated, { ...this.config.validation, intent: parsed.intent })
				const validateDuration = now() - validateStart
				this.emitStage('validate', 'completed', { durationMs: validateDuration, data: validated.validation })
				this.metrics.stages.validate.completedAt = now()
				this.metrics.stages.validate.durationMs = validateDuration

				devLog('pipeline', `Validation: score=${validated.validation.score}, valid=${validated.validation.valid}`)
			}

			// Render stage
			this.emitStage('render', 'started')
			const renderStart = now()
			this.metrics.stages.render.startedAt = renderStart
			const rendered = await render(validated)
			const renderDuration = now() - renderStart
			this.emitStage('render', 'completed', { durationMs: renderDuration })
			this.metrics.stages.render.completedAt = now()
			this.metrics.stages.render.durationMs = renderDuration

			this.metrics.totalDurationMs = now() - pipelineStart

			devLog('pipeline', `Pipeline run completed [${runId}]`, {
				totalDurationMs: this.metrics.totalDurationMs,
			})

			return {
				code: validated.code,
				html: rendered.html,
				css: rendered.css,
				sourceMap: rendered.sourceMap,
				metrics: this.getMetrics(),
				validation: validated.validation,
			}
		} catch (error) {
			devLog('pipeline', `Pipeline error [${runId}]`, { error })
			throw error
		}
	}

	/**
	 * Run the pipeline with streaming generation
	 */
	async *stream(
		input: PipelineInput,
		options?: PipelineRunOptions,
	): AsyncGenerator<
		{ stage: PipelineStage; partial?: string; rendered?: RenderPayload },
		PipelineOutput,
		unknown
	> {
		const pipelineStart = now()
		const runId = createId()

		devLog('pipeline', `Pipeline stream started [${runId}]`, { type: input.type, hasFigmaTokens: !!options?.figmaTokens })

		try {
			// Input stage
			this.emitStage('input', 'started')
			yield { stage: 'input' }
			this.emitStage('input', 'completed')

			// Parse stage
			this.emitStage('parse', 'started')
			yield { stage: 'parse' }
			const parsed = await parse(input)
			this.emitStage('parse', 'completed')

			// Generate stage with streaming
			this.emitStage('generate', 'started')
			let generated: GeneratedOutput | undefined

			// Stream and capture final result in single iteration
			const generateOptions: GenerateOptions = {
				figmaTokens: options?.figmaTokens,
				targetFramework: options?.targetFramework,
			}
			const genIterator = streamGenerate(parsed, this.llm, generateOptions)
			let genResult = await genIterator.next()

			while (!genResult.done) {
				yield { stage: 'generate', partial: genResult.value.partial }
				genResult = await genIterator.next()
			}

			// Generator return value contains the final GeneratedOutput
			generated = genResult.value

			this.emitStage('generate', 'completed')

			// Render stage
			this.emitStage('render', 'started')
			const rendered = await render(generated)
			yield { stage: 'render', rendered }
			this.emitStage('render', 'completed')

			this.metrics.totalDurationMs = now() - pipelineStart

			return {
				code: generated.code,
				html: rendered.html,
				css: rendered.css,
				sourceMap: rendered.sourceMap,
				metrics: this.getMetrics(),
			}
		} catch (error) {
			devLog('pipeline', `Pipeline stream error [${runId}]`, { error })
			throw error
		}
	}

	private emitStage(
		stage: PipelineStage,
		status: 'started' | 'completed' | 'error',
		extra?: { durationMs?: number; data?: unknown; error?: Error },
	): void {
		this.events.emit({
			stage,
			status,
			timestamp: now(),
			...extra,
		})
	}
}

// =============================================================================
// Default Export
// =============================================================================

let defaultPipeline: Pipeline | null = null

export function getPipeline(llm?: LLMManager): Pipeline {
	if (!defaultPipeline || llm) {
		defaultPipeline = new Pipeline(llm)
	}
	return defaultPipeline
}

export default getPipeline

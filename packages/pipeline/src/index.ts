import {
	type PipelineEvent,
	type PipelineInput,
	type PipelineMetrics,
	type PipelineOutput,
	type PipelineStage,
	type RenderPayload,
	devLog,
	now,
	createId,
} from '@v0-clone/shared'
import { type LLMManager, getLLM } from '@v0-clone/llm'
import { parse, type ParsedInput } from './stages/parse'
import { generate, streamGenerate, type GeneratedOutput } from './stages/generate'
import { render } from './stages/render'

export { parse, type ParsedInput } from './stages/parse'
export { generate, streamGenerate, type GeneratedOutput } from './stages/generate'
export { render } from './stages/render'

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

export class Pipeline {
	private llm: LLMManager
	private events = new PipelineEventEmitter()
	private metrics: PipelineMetrics = {
		totalDurationMs: 0,
		stages: {
			input: { durationMs: 0, startedAt: 0, completedAt: 0 },
			parse: { durationMs: 0, startedAt: 0, completedAt: 0 },
			generate: { durationMs: 0, startedAt: 0, completedAt: 0 },
			render: { durationMs: 0, startedAt: 0, completedAt: 0 },
		},
	}

	constructor(llm?: LLMManager) {
		this.llm = llm ?? getLLM()
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
	async run(input: PipelineInput): Promise<PipelineOutput> {
		const pipelineStart = now()
		const runId = createId()

		devLog('pipeline', `Pipeline run started [${runId}]`, { type: input.type })

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
			const generated = await generate(parsed, this.llm)
			const generateDuration = now() - generateStart
			this.emitStage('generate', 'completed', { durationMs: generateDuration })
			this.metrics.stages.generate.completedAt = now()
			this.metrics.stages.generate.durationMs = generateDuration

			// Render stage
			this.emitStage('render', 'started')
			const renderStart = now()
			this.metrics.stages.render.startedAt = renderStart
			const rendered = await render(generated)
			const renderDuration = now() - renderStart
			this.emitStage('render', 'completed', { durationMs: renderDuration })
			this.metrics.stages.render.completedAt = now()
			this.metrics.stages.render.durationMs = renderDuration

			this.metrics.totalDurationMs = now() - pipelineStart

			devLog('pipeline', `Pipeline run completed [${runId}]`, {
				totalDurationMs: this.metrics.totalDurationMs,
			})

			return {
				code: generated.code,
				html: rendered.html,
				css: rendered.css,
				sourceMap: rendered.sourceMap,
				metrics: this.getMetrics(),
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
	): AsyncGenerator<
		{ stage: PipelineStage; partial?: string; rendered?: RenderPayload },
		PipelineOutput,
		unknown
	> {
		const pipelineStart = now()
		const runId = createId()

		devLog('pipeline', `Pipeline stream started [${runId}]`, { type: input.type })

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

			for await (const result of streamGenerate(parsed, this.llm)) {
				yield { stage: 'generate', partial: result.partial }
			}

			// Get final generated result
			const genIterator = streamGenerate(parsed, this.llm)
			let genResult = await genIterator.next()
			while (!genResult.done) {
				genResult = await genIterator.next()
			}
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

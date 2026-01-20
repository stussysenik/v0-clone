import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Pipeline } from '@v0-clone/pipeline'
import { LLMManager } from '@v0-clone/llm'
import { env } from '$env/dynamic/private'
import type { LLMProvider, FigmaDesignTokens, StudioSettings } from '@v0-clone/shared'
import { getCurrentSettings } from '../provider/+server'

// Track current configuration for cache invalidation
let pipeline: Pipeline | null = null
let lastConfigHash: string = ''

function detectProvider(): LLMProvider {
	// 1. Check for runtime settings
	const settings = getCurrentSettings()
	if (settings?.provider) {
		return settings.provider
	}

	// 2. Explicit provider override from env
	const explicit = env.LLM_PROVIDER as LLMProvider | undefined
	if (explicit && ['claude', 'openai', 'ollama', 'zhipu', 'lmstudio'].includes(explicit)) {
		return explicit
	}

	// 3. Auto-detect from API keys
	if (env.ANTHROPIC_API_KEY) return 'claude'
	if (env.OPENAI_API_KEY) return 'openai'
	if (env.ZHIPU_API_KEY) return 'zhipu'

	// 4. Default to local Ollama
	return 'ollama'
}

function getConfigHash(settings: StudioSettings | null, provider: LLMProvider): string {
	if (settings) {
		return `${settings.provider}:${settings.model}:${settings.apiKey?.slice(0, 8) ?? ''}:${settings.baseUrl ?? ''}`
	}
	return `env:${provider}`
}

function getPipelineInstance(): Pipeline {
	const settings = getCurrentSettings()
	const provider = detectProvider()
	const configHash = getConfigHash(settings, provider)

	// Recreate pipeline if configuration changed
	if (!pipeline || lastConfigHash !== configHash) {
		lastConfigHash = configHash

		let model: string | undefined
		let baseUrl: string | undefined
		let apiKey: string | undefined

		if (settings) {
			// Use runtime settings
			model = settings.model
			baseUrl = settings.baseUrl
			apiKey = settings.apiKey
		} else {
			// Fall back to env vars
			model = env.LLM_MODEL
			baseUrl = provider === 'lmstudio'
				? (env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1')
				: provider === 'ollama'
				? (env.OLLAMA_BASE_URL || 'http://localhost:11434')
				: provider === 'zhipu'
				? env.ZHIPU_BASE_URL
				: undefined
			apiKey = provider === 'claude' ? env.ANTHROPIC_API_KEY
				: provider === 'openai' ? env.OPENAI_API_KEY
				: provider === 'zhipu' ? env.ZHIPU_API_KEY
				: undefined
		}

		const llm = new LLMManager({
			provider,
			model,
			baseUrl,
			apiKey,
			temperature: settings?.temperature,
			maxTokens: settings?.maxTokens,
		})
		pipeline = new Pipeline(llm)
	}
	return pipeline
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { prompt, stream: useStream = true, figmaTokens } = await request.json()

		if (!prompt || typeof prompt !== 'string') {
			return json({ error: 'Prompt is required' }, { status: 400 })
		}

		// Prepare pipeline run options
		const runOptions = {
			figmaTokens: figmaTokens as FigmaDesignTokens | undefined,
		}

		if (useStream) {
			// Streaming response
			const encoder = new TextEncoder()
			const readable = new ReadableStream({
				async start(controller) {
					try {
						const pipelineInstance = getPipelineInstance()
						const generator = pipelineInstance.stream({ type: 'prompt', content: prompt }, runOptions)

						for await (const update of generator) {
							const chunk = JSON.stringify({
								stage: update.stage,
								partial: update.partial,
								rendered: update.rendered,
								code: update.code,
								intent: update.intent,
							}) + '\n'

							controller.enqueue(encoder.encode(chunk))
						}

						controller.close()
					} catch (err) {
						const errorMsg = err instanceof Error ? err.message : 'Generation failed'
						controller.enqueue(encoder.encode(JSON.stringify({ error: errorMsg }) + '\n'))
						controller.close()
					}
				},
			})

			return new Response(readable, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			})
		} else {
			// Non-streaming response
			const pipelineInstance = getPipelineInstance()
			const result = await pipelineInstance.run({ type: 'prompt', content: prompt }, runOptions)

			return json({
				code: result.code,
				html: result.html,
				css: result.css,
				sourceMap: result.sourceMap,
				metrics: result.metrics,
				validation: result.validation,
			})
		}
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : 'Internal server error'
		return json({ error: errorMsg }, { status: 500 })
	}
}

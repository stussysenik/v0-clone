import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { Pipeline } from '@v0-clone/pipeline'
import { LLMManager } from '@v0-clone/llm'
import { env } from '$env/dynamic/private'
import type { LLMProvider, FigmaDesignTokens } from '@v0-clone/shared'

// Lazy initialization - LLMManager auto-detects provider from env vars
let pipeline: Pipeline | null = null

function detectProvider(): LLMProvider {
	// 1. Explicit provider override
	const explicit = env.LLM_PROVIDER as LLMProvider | undefined
	if (explicit && ['claude', 'openai', 'ollama', 'zhipu', 'lmstudio'].includes(explicit)) {
		return explicit
	}

	// 2. Auto-detect from API keys
	if (env.ANTHROPIC_API_KEY) return 'claude'
	if (env.OPENAI_API_KEY) return 'openai'
	if (env.ZHIPU_API_KEY) return 'zhipu'

	// 3. Default to local Ollama
	return 'ollama'
}

function getPipelineInstance(): Pipeline {
	if (!pipeline) {
		// Detect provider using SvelteKit's env module (which reads .env.local)
		const provider = detectProvider()
		const model = env.LLM_MODEL
		const baseUrl = provider === 'lmstudio'
			? (env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1')
			: provider === 'ollama'
			? (env.OLLAMA_BASE_URL || 'http://localhost:11434')
			: provider === 'zhipu'
			? env.ZHIPU_BASE_URL
			: undefined

		// Pass configuration explicitly to ensure LLMManager uses correct provider
		const llm = new LLMManager({
			provider,
			model,
			baseUrl,
			apiKey: provider === 'claude' ? env.ANTHROPIC_API_KEY
				: provider === 'openai' ? env.OPENAI_API_KEY
				: provider === 'zhipu' ? env.ZHIPU_API_KEY
				: undefined
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

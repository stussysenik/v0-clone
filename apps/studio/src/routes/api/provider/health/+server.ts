import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { LLMManager } from '@v0-clone/llm'
import { env } from '$env/dynamic/private'
import type { LLMProvider } from '@v0-clone/shared'

function detectProvider(): LLMProvider {
	const explicit = env.LLM_PROVIDER as LLMProvider | undefined
	if (explicit && ['claude', 'openai', 'ollama', 'zhipu', 'lmstudio'].includes(explicit)) {
		return explicit
	}
	if (env.ANTHROPIC_API_KEY) return 'claude'
	if (env.OPENAI_API_KEY) return 'openai'
	if (env.ZHIPU_API_KEY) return 'zhipu'
	return 'ollama'
}

let llmManager: LLMManager | null = null

function getLLMInstance(): LLMManager {
	if (!llmManager) {
		const provider = detectProvider()
		const baseUrl = provider === 'lmstudio'
			? (env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1')
			: provider === 'ollama'
			? (env.OLLAMA_BASE_URL || 'http://localhost:11434')
			: provider === 'zhipu'
			? env.ZHIPU_BASE_URL
			: undefined

		llmManager = new LLMManager({
			provider,
			model: env.LLM_MODEL,
			baseUrl,
			apiKey: provider === 'claude' ? env.ANTHROPIC_API_KEY
				: provider === 'openai' ? env.OPENAI_API_KEY
				: provider === 'zhipu' ? env.ZHIPU_API_KEY
				: undefined
		})
	}
	return llmManager
}

export const GET: RequestHandler = async () => {
	const llm = getLLMInstance()
	const providerInfo = llm.getProviderInfo()
	const startTime = performance.now()

	try {
		const result = await llm.testConnection()
		const totalLatencyMs = performance.now() - startTime

		return json({
			provider: providerInfo.provider,
			model: providerInfo.model,
			connected: result.ok,
			latencyMs: result.latencyMs,
			totalLatencyMs,
			error: result.error,
			details: result.details,
			isLocal: providerInfo.provider === 'ollama' || providerInfo.provider === 'lmstudio',
		})
	} catch (err) {
		return json({
			provider: providerInfo.provider,
			model: providerInfo.model,
			connected: false,
			latencyMs: performance.now() - startTime,
			error: err instanceof Error ? err.message : 'Health check failed',
			isLocal: providerInfo.provider === 'ollama' || providerInfo.provider === 'lmstudio',
		}, { status: 503 })
	}
}

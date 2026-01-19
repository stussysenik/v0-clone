import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

type ProviderName = 'claude' | 'openai' | 'ollama' | 'zhipu' | 'lmstudio'

function detectProvider(): ProviderName {
	// 1. Explicit provider override
	const explicit = env.LLM_PROVIDER as ProviderName | undefined
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

function getDefaultModel(provider: ProviderName): string {
	if (env.LLM_MODEL) return env.LLM_MODEL

	switch (provider) {
		case 'claude':
			return 'claude-sonnet-4-20250514'
		case 'openai':
			return 'gpt-4o'
		case 'ollama':
			return 'codellama:13b'
		case 'lmstudio':
			return 'devstral-small-2'
		case 'zhipu':
			return 'glm-4'
		default:
			return 'unknown'
	}
}

export const GET: RequestHandler = async () => {
	const provider = detectProvider()
	const model = getDefaultModel(provider)

	return json({
		provider,
		model,
		isLocal: provider === 'ollama' || provider === 'lmstudio',
		configured: {
			claude: !!env.ANTHROPIC_API_KEY,
			openai: !!env.OPENAI_API_KEY,
			zhipu: !!env.ZHIPU_API_KEY,
			ollama: true, // Always available locally
			lmstudio: true, // Always available locally
		},
	})
}

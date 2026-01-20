import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'
import type { StudioSettings } from '@v0-clone/shared'

type ProviderName = 'claude' | 'openai' | 'ollama' | 'zhipu' | 'lmstudio' | 'custom'

// In-memory settings store (persists until server restart)
// This is overridden by client-side localStorage on page load
let currentSettings: StudioSettings | null = null

function detectProvider(): ProviderName {
	// 1. Use in-memory settings if set
	if (currentSettings?.provider) {
		return currentSettings.provider
	}

	// 2. Explicit provider override from env
	const explicit = env.LLM_PROVIDER as ProviderName | undefined
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

function getDefaultModel(provider: ProviderName): string {
	// Use in-memory settings model if available
	if (currentSettings?.model) return currentSettings.model

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
			return 'glm-4.7-flash'
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
			claude: !!env.ANTHROPIC_API_KEY || !!currentSettings?.apiKey,
			openai: !!env.OPENAI_API_KEY || !!currentSettings?.apiKey,
			zhipu: !!env.ZHIPU_API_KEY || !!currentSettings?.apiKey,
			ollama: true, // Always available locally
			lmstudio: true, // Always available locally
			custom: !!currentSettings?.apiKey && !!currentSettings?.baseUrl,
		},
	})
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const settings = await request.json() as StudioSettings

		// Store settings in memory
		currentSettings = settings

		const provider = settings.provider
		const model = settings.model
		const isLocal = provider === 'ollama' || provider === 'lmstudio'

		return json({
			provider,
			model,
			isLocal,
			configured: {
				claude: !!env.ANTHROPIC_API_KEY || (provider === 'claude' && !!settings.apiKey),
				openai: !!env.OPENAI_API_KEY || (provider === 'openai' && !!settings.apiKey),
				zhipu: !!env.ZHIPU_API_KEY || (provider === 'zhipu' && !!settings.apiKey),
				ollama: true,
				lmstudio: true,
				custom: provider === 'custom' && !!settings.apiKey && !!settings.baseUrl,
			},
		})
	} catch (e) {
		return json({ error: 'Invalid settings' }, { status: 400 })
	}
}

// Export getter for use by other endpoints (like /api/generate)
export function getCurrentSettings(): StudioSettings | null {
	return currentSettings
}

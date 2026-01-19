import {
	type LLMConfig,
	type LLMMessage,
	type LLMProvider,
	type LLMProviderInterface,
	type LLMResponse,
	type LLMStreamChunk,
	devLog,
} from '@v0-clone/shared'

import { ClaudeProvider } from './providers/claude'
import { OllamaProvider } from './providers/ollama'
import { OpenAIProvider } from './providers/openai'

export { ClaudeProvider } from './providers/claude'
export { OpenAIProvider } from './providers/openai'
export { OllamaProvider } from './providers/ollama'

// =============================================================================
// Provider Registry
// =============================================================================

type ProviderConstructor = new (config?: Partial<LLMConfig>) => LLMProviderInterface

const providerRegistry: Record<LLMProvider, ProviderConstructor> = {
	claude: ClaudeProvider,
	openai: OpenAIProvider,
	ollama: OllamaProvider,
	custom: ClaudeProvider, // Default fallback
}

/**
 * Register a custom provider
 */
export function registerProvider(name: LLMProvider, provider: ProviderConstructor): void {
	providerRegistry[name] = provider
	devLog('llm', `Registered provider: ${name}`)
}

// =============================================================================
// LLM Manager - Hot-swappable Provider System
// =============================================================================

export class LLMManager {
	private currentProvider: LLMProviderInterface
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		const providerName = config?.provider ?? this.detectProvider()

		this.config = {
			provider: providerName,
			model: config?.model ?? this.getDefaultModel(providerName),
			apiKey: config?.apiKey,
			baseUrl: config?.baseUrl,
			maxTokens: config?.maxTokens ?? 4096,
			temperature: config?.temperature ?? 0.7,
		}

		const ProviderClass = providerRegistry[providerName]
		this.currentProvider = new ProviderClass(this.config)

		devLog('llm', `LLM Manager initialized`, {
			provider: providerName,
			model: this.config.model,
		})
	}

	/**
	 * Detect provider from environment variables
	 */
	private detectProvider(): LLMProvider {
		if (process.env.ANTHROPIC_API_KEY) return 'claude'
		if (process.env.OPENAI_API_KEY) return 'openai'
		return 'ollama' // Default to local
	}

	/**
	 * Get default model for provider
	 */
	private getDefaultModel(provider: LLMProvider): string {
		switch (provider) {
			case 'claude':
				return 'claude-sonnet-4-20250514'
			case 'openai':
				return 'gpt-4o'
			case 'ollama':
				return 'llama3.2'
			default:
				return 'claude-sonnet-4-20250514'
		}
	}

	/**
	 * Hot-swap to a different provider without restarting
	 */
	switchProvider(provider: LLMProvider, config?: Partial<LLMConfig>): void {
		const newConfig: LLMConfig = {
			...this.config,
			provider,
			model: config?.model ?? this.getDefaultModel(provider),
			...config,
		}

		const ProviderClass = providerRegistry[provider]
		this.currentProvider = new ProviderClass(newConfig)
		this.config = newConfig

		devLog('llm', `Switched provider`, {
			from: this.config.provider,
			to: provider,
			model: newConfig.model,
		})
	}

	/**
	 * Get current provider info
	 */
	getProviderInfo(): { provider: LLMProvider; model: string } {
		return {
			provider: this.config.provider,
			model: this.config.model,
		}
	}

	/**
	 * Generate a response (non-streaming)
	 */
	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		return this.currentProvider.generate(messages, config)
	}

	/**
	 * Stream a response
	 */
	stream(
		messages: LLMMessage[],
		config?: Partial<LLMConfig>,
	): AsyncGenerator<LLMStreamChunk, void, unknown> {
		return this.currentProvider.stream(messages, config)
	}

	/**
	 * Generate UI component code from a prompt
	 */
	async generateComponent(prompt: string): Promise<string> {
		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: `You are an expert frontend developer. Generate clean, modern UI components using Svelte 5 and TailwindCSS.

Rules:
- Use Svelte 5 runes ($state, $props, $derived)
- Use TailwindCSS utility classes for styling
- Make components responsive and accessible
- Include smooth transitions and animations
- Export a default component

Output ONLY the Svelte component code, no explanations.`,
			},
			{
				role: 'user',
				content: prompt,
			},
		]

		const response = await this.generate(messages)
		return this.extractCode(response.content)
	}

	/**
	 * Stream UI component generation
	 */
	async *streamComponent(prompt: string): AsyncGenerator<string, void, unknown> {
		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: `You are an expert frontend developer. Generate clean, modern UI components using Svelte 5 and TailwindCSS.

Rules:
- Use Svelte 5 runes ($state, $props, $derived)
- Use TailwindCSS utility classes for styling
- Make components responsive and accessible
- Include smooth transitions and animations
- Export a default component

Output ONLY the Svelte component code, no explanations.`,
			},
			{
				role: 'user',
				content: prompt,
			},
		]

		for await (const chunk of this.stream(messages)) {
			if (chunk.content) {
				yield chunk.content
			}
		}
	}

	/**
	 * Extract code from markdown code blocks
	 */
	private extractCode(content: string): string {
		// Match ```svelte or ```html or just ```
		const codeBlockMatch = content.match(/```(?:svelte|html)?\n([\s\S]*?)```/)
		if (codeBlockMatch) {
			return codeBlockMatch[1].trim()
		}
		return content.trim()
	}
}

// =============================================================================
// Default Export - Singleton Instance
// =============================================================================

let defaultManager: LLMManager | null = null

export function getLLM(config?: Partial<LLMConfig>): LLMManager {
	if (!defaultManager || config) {
		defaultManager = new LLMManager(config)
	}
	return defaultManager
}

export default getLLM

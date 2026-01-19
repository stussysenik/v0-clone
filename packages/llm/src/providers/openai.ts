import {
	type LLMConfig,
	type LLMMessage,
	type LLMProviderInterface,
	type LLMResponse,
	type LLMStreamChunk,
	type HealthCheckResult,
	devLog,
	now,
} from '@v0-clone/shared'

const DEFAULT_MODEL = 'gpt-4o'
const DEFAULT_MAX_TOKENS = 4096

/**
 * OpenAI-compatible provider
 * Works with: OpenAI, Ollama, Together, Groq, etc.
 */
export class OpenAIProvider implements LLMProviderInterface {
	readonly name = 'openai' as const
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		this.config = {
			provider: 'openai',
			model: config?.model ?? DEFAULT_MODEL,
			apiKey: config?.apiKey ?? process.env.OPENAI_API_KEY,
			baseUrl: config?.baseUrl ?? 'https://api.openai.com/v1',
			maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
			temperature: config?.temperature ?? 0.7,
		}
	}

	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		const startTime = now()
		const mergedConfig = { ...this.config, ...config }

		devLog('llm', `OpenAI generate started`, { model: mergedConfig.model, messages: messages.length })

		const response = await fetch(`${mergedConfig.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${mergedConfig.apiKey}`,
			},
			body: JSON.stringify({
				model: mergedConfig.model,
				max_tokens: mergedConfig.maxTokens,
				temperature: mergedConfig.temperature,
				messages: messages.map(m => ({
					role: m.role,
					content: m.content,
				})),
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			devLog('llm', `OpenAI error: ${response.status}`, error)
			throw new Error(`OpenAI API error: ${response.status} - ${error}`)
		}

		const data = await response.json()
		const durationMs = now() - startTime

		devLog('llm', `OpenAI generate completed`, {
			durationMs,
			tokens: data.usage?.completion_tokens,
		})

		return {
			content: data.choices[0]?.message?.content ?? '',
			usage: {
				promptTokens: data.usage?.prompt_tokens ?? 0,
				completionTokens: data.usage?.completion_tokens ?? 0,
				totalTokens: data.usage?.total_tokens ?? 0,
			},
			durationMs,
		}
	}

	async *stream(
		messages: LLMMessage[],
		config?: Partial<LLMConfig>,
	): AsyncGenerator<LLMStreamChunk, void, unknown> {
		const startTime = now()
		const mergedConfig = { ...this.config, ...config }

		devLog('llm', `OpenAI stream started`, { model: mergedConfig.model })

		const response = await fetch(`${mergedConfig.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${mergedConfig.apiKey}`,
			},
			body: JSON.stringify({
				model: mergedConfig.model,
				max_tokens: mergedConfig.maxTokens,
				temperature: mergedConfig.temperature,
				stream: true,
				messages: messages.map(m => ({
					role: m.role,
					content: m.content,
				})),
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`OpenAI API error: ${response.status} - ${error}`)
		}

		const reader = response.body?.getReader()
		if (!reader) throw new Error('No response body')

		const decoder = new TextDecoder()
		let buffer = ''
		let totalTokens = 0

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue
					const data = line.slice(6).trim()
					if (data === '[DONE]') continue

					try {
						const parsed = JSON.parse(data)
						const content = parsed.choices[0]?.delta?.content ?? ''

						if (content) {
							totalTokens++
							yield {
								content,
								done: false,
							}
						}
					} catch {
						// Skip invalid JSON lines
					}
				}
			}
		} finally {
			reader.releaseLock()
		}

		devLog('llm', `OpenAI stream completed`, { durationMs: now() - startTime })

		yield {
			content: '',
			done: true,
			usage: {
				promptTokens: 0, // Not available in streaming
				completionTokens: totalTokens,
			},
		}
	}

	/**
	 * Test connection to OpenAI API
	 */
	async testConnection(): Promise<HealthCheckResult> {
		const startTime = now()

		try {
			const response = await fetch(`${this.config.baseUrl}/models`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.config.apiKey}`,
				},
			})

			const latencyMs = now() - startTime

			if (!response.ok) {
				return {
					ok: false,
					error: `OpenAI returned ${response.status}`,
					latencyMs,
				}
			}

			const data = await response.json()
			const models = data.data?.map((m: { id: string }) => m.id) ?? []

			return {
				ok: true,
				latencyMs,
				details: {
					models: models.slice(0, 5),
					modelCount: models.length,
				},
			}
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : 'Connection failed',
				latencyMs: now() - startTime,
			}
		}
	}
}

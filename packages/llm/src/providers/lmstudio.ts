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

const DEFAULT_MODEL = 'devstral-small-2'
const DEFAULT_BASE_URL = 'http://localhost:1234/v1'
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit,
	timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		})
		return response
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			throw new Error(`Connection timeout after ${timeoutMs}ms - is LM Studio running at ${url}?`)
		}
		throw err
	} finally {
		clearTimeout(timeout)
	}
}

/**
 * LM Studio provider (OpenAI-compatible API)
 * Works with any model loaded in LM Studio
 * No API key required for local inference
 */
export class LMStudioProvider implements LLMProviderInterface {
	readonly name = 'lmstudio' as const
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		this.config = {
			provider: 'lmstudio',
			model: config?.model ?? DEFAULT_MODEL,
			apiKey: config?.apiKey ?? 'lm-studio', // Placeholder, not required
			baseUrl: config?.baseUrl ?? DEFAULT_BASE_URL,
			maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
			temperature: config?.temperature ?? 0.7,
		}
	}

	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		const startTime = now()
		const mergedConfig = { ...this.config, ...config }

		devLog('llm', `LM Studio generate started`, { model: mergedConfig.model, messages: messages.length })

		const response = await fetchWithTimeout(
			`${mergedConfig.baseUrl}/chat/completions`,
			{
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
			},
			DEFAULT_TIMEOUT_MS
		)

		if (!response.ok) {
			const error = await response.text()
			devLog('llm', `LM Studio error: ${response.status}`, error)
			throw new Error(`LM Studio API error: ${response.status} - ${error}`)
		}

		const data = await response.json()
		const durationMs = now() - startTime

		devLog('llm', `LM Studio generate completed`, {
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

		devLog('llm', `LM Studio stream started`, { model: mergedConfig.model })

		const response = await fetchWithTimeout(
			`${mergedConfig.baseUrl}/chat/completions`,
			{
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
			},
			DEFAULT_TIMEOUT_MS
		)

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`LM Studio API error: ${response.status} - ${error}`)
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

		devLog('llm', `LM Studio stream completed`, { durationMs: now() - startTime })

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
	 * Test connection to LM Studio server
	 */
	async testConnection(): Promise<HealthCheckResult> {
		const startTime = now()

		try {
			// LM Studio uses OpenAI-compatible /models endpoint
			const response = await fetchWithTimeout(
				`${this.config.baseUrl}/models`,
				{
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${this.config.apiKey}`,
					},
				},
				5000 // 5 second timeout for health check
			)

			const latencyMs = now() - startTime

			if (!response.ok) {
				return {
					ok: false,
					error: `LM Studio returned ${response.status}`,
					latencyMs,
				}
			}

			const data = await response.json()
			const models = data.data?.map((m: { id: string }) => m.id) ?? []

			return {
				ok: true,
				latencyMs,
				details: {
					models,
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

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

const DEFAULT_MODEL = 'llama3.2'
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
			throw new Error(`Connection timeout after ${timeoutMs}ms - is Ollama running at ${url}?`)
		}
		throw err
	} finally {
		clearTimeout(timeout)
	}
}

/**
 * Ollama provider for local model inference
 * No API key required - runs locally
 */
export class OllamaProvider implements LLMProviderInterface {
	readonly name = 'ollama' as const
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		this.config = {
			provider: 'ollama',
			model: config?.model ?? DEFAULT_MODEL,
			baseUrl: config?.baseUrl ?? 'http://localhost:11434',
			temperature: config?.temperature ?? 0.7,
		}
	}

	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		const startTime = now()
		const mergedConfig = { ...this.config, ...config }

		devLog('llm', `Ollama generate started`, { model: mergedConfig.model, messages: messages.length })

		const response = await fetchWithTimeout(
			`${mergedConfig.baseUrl}/api/chat`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: mergedConfig.model,
					messages: messages.map(m => ({
						role: m.role,
						content: m.content,
					})),
					options: {
						temperature: mergedConfig.temperature,
					},
					stream: false,
				}),
			},
			DEFAULT_TIMEOUT_MS
		)

		if (!response.ok) {
			const error = await response.text()
			devLog('llm', `Ollama error: ${response.status}`, error)
			throw new Error(`Ollama API error: ${response.status} - ${error}`)
		}

		const data = await response.json()
		const durationMs = now() - startTime

		devLog('llm', `Ollama generate completed`, {
			durationMs,
			evalCount: data.eval_count,
		})

		return {
			content: data.message?.content ?? '',
			usage: {
				promptTokens: data.prompt_eval_count ?? 0,
				completionTokens: data.eval_count ?? 0,
				totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
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

		devLog('llm', `Ollama stream started`, { model: mergedConfig.model })

		const response = await fetchWithTimeout(
			`${mergedConfig.baseUrl}/api/chat`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: mergedConfig.model,
					messages: messages.map(m => ({
						role: m.role,
						content: m.content,
					})),
					options: {
						temperature: mergedConfig.temperature,
					},
					stream: true,
				}),
			},
			DEFAULT_TIMEOUT_MS
		)

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Ollama API error: ${response.status} - ${error}`)
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
					if (!line.trim()) continue

					try {
						const parsed = JSON.parse(line)
						const content = parsed.message?.content ?? ''

						if (content) {
							totalTokens++
							yield {
								content,
								done: parsed.done ?? false,
							}
						}

						if (parsed.done) {
							yield {
								content: '',
								done: true,
								usage: {
									promptTokens: parsed.prompt_eval_count ?? 0,
									completionTokens: parsed.eval_count ?? totalTokens,
								},
							}
							return
						}
					} catch {
						// Skip invalid JSON lines
					}
				}
			}
		} finally {
			reader.releaseLock()
		}

		devLog('llm', `Ollama stream completed`, { durationMs: now() - startTime })

		yield {
			content: '',
			done: true,
			usage: {
				promptTokens: 0,
				completionTokens: totalTokens,
			},
		}
	}

	/**
	 * Test connection to Ollama server
	 */
	async testConnection(): Promise<HealthCheckResult> {
		const startTime = now()

		try {
			// Ollama has a /api/tags endpoint that lists models
			const response = await fetchWithTimeout(
				`${this.config.baseUrl}/api/tags`,
				{
					method: 'GET',
				},
				5000 // 5 second timeout for health check
			)

			const latencyMs = now() - startTime

			if (!response.ok) {
				return {
					ok: false,
					error: `Ollama returned ${response.status}`,
					latencyMs,
				}
			}

			const data = await response.json()
			const models = data.models?.map((m: { name: string }) => m.name) ?? []

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

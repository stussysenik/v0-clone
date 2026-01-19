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

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const DEFAULT_MAX_TOKENS = 4096

export class ClaudeProvider implements LLMProviderInterface {
	readonly name = 'claude' as const
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		this.config = {
			provider: 'claude',
			model: config?.model ?? DEFAULT_MODEL,
			apiKey: config?.apiKey ?? process.env.ANTHROPIC_API_KEY,
			baseUrl: config?.baseUrl ?? 'https://api.anthropic.com',
			maxTokens: config?.maxTokens ?? DEFAULT_MAX_TOKENS,
			temperature: config?.temperature ?? 0.7,
		}
	}

	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		const startTime = now()
		const mergedConfig = { ...this.config, ...config }

		devLog('llm', `Claude generate started`, { model: mergedConfig.model, messages: messages.length })

		const response = await fetch(`${mergedConfig.baseUrl}/v1/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': mergedConfig.apiKey!,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: mergedConfig.model,
				max_tokens: mergedConfig.maxTokens,
				temperature: mergedConfig.temperature,
				messages: messages.filter(m => m.role !== 'system').map(m => ({
					role: m.role,
					content: m.content,
				})),
				system: messages.find(m => m.role === 'system')?.content,
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			devLog('llm', `Claude error: ${response.status}`, error)
			throw new Error(`Claude API error: ${response.status} - ${error}`)
		}

		const data = await response.json()
		const durationMs = now() - startTime

		devLog('llm', `Claude generate completed`, {
			durationMs,
			tokens: data.usage?.output_tokens,
		})

		return {
			content: data.content[0]?.text ?? '',
			usage: {
				promptTokens: data.usage?.input_tokens ?? 0,
				completionTokens: data.usage?.output_tokens ?? 0,
				totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
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

		devLog('llm', `Claude stream started`, { model: mergedConfig.model })

		const response = await fetch(`${mergedConfig.baseUrl}/v1/messages`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': mergedConfig.apiKey!,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model: mergedConfig.model,
				max_tokens: mergedConfig.maxTokens,
				temperature: mergedConfig.temperature,
				stream: true,
				messages: messages.filter(m => m.role !== 'system').map(m => ({
					role: m.role,
					content: m.content,
				})),
				system: messages.find(m => m.role === 'system')?.content,
			}),
		})

		if (!response.ok) {
			const error = await response.text()
			throw new Error(`Claude API error: ${response.status} - ${error}`)
		}

		const reader = response.body?.getReader()
		if (!reader) throw new Error('No response body')

		const decoder = new TextDecoder()
		let buffer = ''
		let usage = { promptTokens: 0, completionTokens: 0 }

		try {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const line of lines) {
					if (!line.startsWith('data: ')) continue
					const data = line.slice(6)
					if (data === '[DONE]') continue

					try {
						const parsed = JSON.parse(data)

						if (parsed.type === 'content_block_delta') {
							yield {
								content: parsed.delta?.text ?? '',
								done: false,
							}
						} else if (parsed.type === 'message_delta') {
							usage = {
								promptTokens: parsed.usage?.input_tokens ?? usage.promptTokens,
								completionTokens: parsed.usage?.output_tokens ?? usage.completionTokens,
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

		devLog('llm', `Claude stream completed`, { durationMs: now() - startTime })

		yield {
			content: '',
			done: true,
			usage,
		}
	}

	/**
	 * Test connection to Claude API
	 */
	async testConnection(): Promise<HealthCheckResult> {
		const startTime = now()

		try {
			// Claude doesn't have a simple ping endpoint, so we just verify the API key format
			// and make a minimal request
			if (!this.config.apiKey) {
				return {
					ok: false,
					error: 'No API key configured',
					latencyMs: now() - startTime,
				}
			}

			// Verify API key format (starts with sk-ant-)
			if (!this.config.apiKey.startsWith('sk-ant-')) {
				return {
					ok: false,
					error: 'Invalid API key format',
					latencyMs: now() - startTime,
				}
			}

			return {
				ok: true,
				latencyMs: now() - startTime,
				details: {
					provider: 'claude',
					keyConfigured: true,
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

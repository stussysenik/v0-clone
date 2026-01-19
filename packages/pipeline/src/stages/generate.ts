import { type LLMStreamChunk, devLog, now } from '@v0-clone/shared'
import { type LLMManager, getLLM } from '@v0-clone/llm'
import type { ParsedInput } from './parse'

export interface GeneratedOutput {
	code: string
	language: 'svelte' | 'html' | 'react'
	sourceMap: Record<string, string> // data-oid -> code location
}

/**
 * Generate stage - uses LLM to generate component code
 */
export async function generate(
	input: ParsedInput,
	llm?: LLMManager,
): Promise<GeneratedOutput> {
	const startTime = now()
	const manager = llm ?? getLLM()

	devLog('pipeline', 'Generate stage started', {
		provider: manager.getProviderInfo(),
		complexity: input.metadata.estimatedComplexity,
	})

	const code = await manager.generateComponent(input.prompt)
	const durationMs = now() - startTime

	// Inject data-oid attributes for source mapping
	const { processedCode, sourceMap } = injectSourceMapping(code)

	devLog('pipeline', 'Generate stage completed', {
		durationMs,
		codeLength: processedCode.length,
		mappedElements: Object.keys(sourceMap).length,
	})

	return {
		code: processedCode,
		language: detectLanguage(code),
		sourceMap,
	}
}

/**
 * Stream generate - yields partial results as they come
 */
export async function* streamGenerate(
	input: ParsedInput,
	llm?: LLMManager,
): AsyncGenerator<{ partial: string; chunk: LLMStreamChunk }, GeneratedOutput, unknown> {
	const startTime = now()
	const manager = llm ?? getLLM()

	devLog('pipeline', 'Stream generate started', {
		provider: manager.getProviderInfo(),
	})

	let fullCode = ''

	for await (const chunk of manager.streamComponent(input.prompt)) {
		fullCode += chunk
		yield {
			partial: fullCode,
			chunk: { content: chunk, done: false },
		}
	}

	const durationMs = now() - startTime
	const { processedCode, sourceMap } = injectSourceMapping(fullCode)

	devLog('pipeline', 'Stream generate completed', {
		durationMs,
		codeLength: processedCode.length,
	})

	return {
		code: processedCode,
		language: detectLanguage(fullCode),
		sourceMap,
	}
}

/**
 * Inject data-oid attributes into HTML elements for source mapping
 * This enables the visual editor to map DOM elements back to source code
 */
function injectSourceMapping(code: string): {
	processedCode: string
	sourceMap: Record<string, string>
} {
	const sourceMap: Record<string, string> = {}
	let oidCounter = 0

	// Match opening HTML tags and inject data-oid
	const processedCode = code.replace(
		/<([a-zA-Z][a-zA-Z0-9]*)([\s>])/g,
		(match, tagName, suffix, offset) => {
			// Skip script, style, and self-closing tags like br, hr, img
			const skipTags = ['script', 'style', 'br', 'hr', 'img', 'input', 'meta', 'link']
			if (skipTags.includes(tagName.toLowerCase())) {
				return match
			}

			const oid = `oid-${oidCounter++}`
			const line = code.substring(0, offset).split('\n').length
			sourceMap[oid] = `line:${line}`

			if (suffix === '>') {
				return `<${tagName} data-oid="${oid}">`
			}
			return `<${tagName} data-oid="${oid}"${suffix}`
		},
	)

	return { processedCode, sourceMap }
}

/**
 * Detect the language/framework of generated code
 */
function detectLanguage(code: string): 'svelte' | 'html' | 'react' {
	// Check for Svelte-specific syntax
	if (
		code.includes('$state') ||
		code.includes('$props') ||
		code.includes('$derived') ||
		code.includes('<script') && code.includes('</script>') && code.includes('<style')
	) {
		return 'svelte'
	}

	// Check for React/JSX syntax
	if (
		code.includes('useState') ||
		code.includes('useEffect') ||
		code.includes('className=') ||
		code.includes('export default function')
	) {
		return 'react'
	}

	return 'html'
}

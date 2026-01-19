import { type LLMStreamChunk, type FigmaDesignTokens, devLog, now } from '@v0-clone/shared'
import { type LLMManager, getLLM } from '@v0-clone/llm'
import type { ParsedInput } from './parse'

export interface GeneratedOutput {
	code: string
	language: 'svelte' | 'html' | 'react'
	sourceMap: Record<string, string> // data-oid -> code location
}

export interface GenerateOptions {
	figmaTokens?: FigmaDesignTokens | null
	targetFramework?: 'svelte' | 'react' | 'html'
}

/**
 * Generate stage - uses LLM to generate component code
 */
export async function generate(
	input: ParsedInput,
	llm?: LLMManager,
	options?: GenerateOptions,
): Promise<GeneratedOutput> {
	const startTime = now()
	const manager = llm ?? getLLM()

	devLog('pipeline', 'Generate stage started', {
		provider: manager.getProviderInfo(),
		complexity: input.metadata.estimatedComplexity,
		intent: input.intent,
		hasFigmaTokens: !!options?.figmaTokens,
	})

	// Build prompt with Figma context if available
	const promptWithContext = buildPromptWithContext(input.prompt, options)

	const code = await manager.generateComponent(promptWithContext, input.intent)
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
	options?: GenerateOptions,
): AsyncGenerator<{ partial: string; chunk: LLMStreamChunk }, GeneratedOutput, unknown> {
	const startTime = now()
	const manager = llm ?? getLLM()

	devLog('pipeline', 'Stream generate started', {
		provider: manager.getProviderInfo(),
		intent: input.intent,
		hasFigmaTokens: !!options?.figmaTokens,
	})

	// Build prompt with Figma context if available
	const promptWithContext = buildPromptWithContext(input.prompt, options)

	let fullCode = ''

	for await (const chunk of manager.streamComponent(promptWithContext, input.intent)) {
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
 * Build prompt with Figma design token context
 */
function buildPromptWithContext(prompt: string, options?: GenerateOptions): string {
	if (!options?.figmaTokens) {
		return prompt
	}

	const tokens = options.figmaTokens

	// Build a context string with the design tokens
	const contextParts: string[] = []

	// Add color palette
	const allColors: string[] = []
	for (const category of ['primary', 'secondary', 'neutral', 'semantic', 'custom'] as const) {
		const colors = tokens.colors[category]
		for (const [name, color] of Object.entries(colors)) {
			allColors.push(`${name}: ${color.value}`)
		}
	}
	if (allColors.length > 0) {
		contextParts.push(`DESIGN COLORS: ${allColors.slice(0, 20).join(', ')}`)
	}

	// Add typography
	if (tokens.typography.fontFamilies.length > 0) {
		contextParts.push(`FONTS: ${tokens.typography.fontFamilies.join(', ')}`)
	}

	// Add spacing scale
	const spacingValues = Object.entries(tokens.spacing)
		.slice(0, 10)
		.map(([name, s]) => `${s.value}${s.unit}`)
	if (spacingValues.length > 0) {
		contextParts.push(`SPACING SCALE: ${spacingValues.join(', ')}`)
	}

	// Add border radii
	const radiiValues = Object.entries(tokens.borderRadii)
		.slice(0, 5)
		.map(([name, r]) => `${r.value}px`)
	if (radiiValues.length > 0) {
		contextParts.push(`BORDER RADII: ${radiiValues.join(', ')}`)
	}

	if (contextParts.length === 0) {
		return prompt
	}

	// Prepend design context to the prompt
	return `[DESIGN SYSTEM CONTEXT]
${contextParts.join('\n')}
[/DESIGN SYSTEM CONTEXT]

Use the above design tokens when generating the component. Apply the colors, fonts, and spacing from the design system.

USER REQUEST:
${prompt}`
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

import { type PipelineInput, devLog, now } from '@v0-clone/shared'

export type Intent = 'component' | 'section' | 'page' | 'app'

export interface ParsedInput {
	type: PipelineInput['type']
	prompt: string
	intent: Intent
	metadata: {
		hasImages: boolean
		wordCount: number
		estimatedComplexity: 'simple' | 'medium' | 'complex'
		detectedKeywords: string[]
	}
}

/**
 * Parse stage - converts raw input into structured format for generation
 */
export async function parse(input: PipelineInput): Promise<ParsedInput> {
	const startTime = now()

	devLog('pipeline', 'Parse stage started', { type: input.type })

	let prompt = input.content
	let hasImages = false

	// Handle different input types
	switch (input.type) {
		case 'markdown':
			prompt = parseMarkdown(input.content)
			hasImages = input.content.includes('![')
			break

		case 'image':
			prompt = `Create a UI component that matches this design: [image attached]`
			hasImages = true
			break

		case 'file':
			prompt = `Generate a component based on this file content:\n\n${input.content}`
			break

		case 'prompt':
		default:
			// Already a prompt, use as-is
			break
	}

	const wordCount = prompt.split(/\s+/).length
	const estimatedComplexity = wordCount < 20 ? 'simple' : wordCount < 100 ? 'medium' : 'complex'
	const { intent, keywords } = detectIntent(prompt)

	const result: ParsedInput = {
		type: input.type,
		prompt,
		intent,
		metadata: {
			hasImages,
			wordCount,
			estimatedComplexity,
			detectedKeywords: keywords,
		},
	}

	const durationMs = now() - startTime
	devLog('pipeline', 'Parse stage completed', { durationMs, intent, ...result.metadata })

	return result
}

/**
 * Detect user intent from prompt
 */
function detectIntent(prompt: string): { intent: Intent; keywords: string[] } {
	const lower = prompt.toLowerCase()
	const keywords: string[] = []

	// App patterns - interactive applications with state
	const appPatterns = [
		/\b(todo|task)\s*(app|application|list|manager)/i,
		/\b(chat|messaging)\s*(app|application|interface)/i,
		/\b(admin|dashboard)\s*(panel|app|application)/i,
		/\b(e-?commerce|shop|store)\s*(app|application|site)/i,
		/\bbuild\s+(an?|the)\s+\w*\s*(app|application)/i,
		/\b(calculator|timer|counter|game)\b/i,
		/\b(note|notes)\s*(app|taking)/i,
		/\b(kanban|trello|board)\b/i,
		/\binteractive\s+\w+\s*(app|tool)/i,
	]

	// Page patterns - complete pages/websites
	const pagePatterns = [
		/\b(landing|home)\s*page/i,
		/\b(website|webpage|site)\b/i,
		/\bportfolio\b/i,
		/\b(saas|startup)\s*(landing|page|website)/i,
		/\b(product|company|agency)\s*(page|site|website)/i,
		/\b(blog|news)\s*(page|site|website)/i,
		/\bcreate\s+(a\s+)?(complete|full|entire)/i,
		/\b(marketing|promo|promotional)\s*(page|site)/i,
		/\b(about|contact|pricing|features)\s+page/i,
		/\bdashboard\b(?!\s*(component|card))/i,
	]

	// Section patterns - page sections
	const sectionPatterns = [
		/\b(hero|header)\s*section/i,
		/\b(feature|features)\s*section/i,
		/\b(pricing)\s*(table|section|grid|cards)/i,
		/\b(testimonial|review)s?\s*(section|grid|carousel)/i,
		/\b(team)\s*(section|grid|cards)/i,
		/\b(faq|footer|cta|call.to.action)\s*section/i,
		/\b(gallery|portfolio)\s*section/i,
		/\b(contact|newsletter)\s*(form|section)/i,
		/\bsection\b/i,
	]

	// Component patterns - single UI components
	const componentPatterns = [
		/\b(button|btn)\b/i,
		/\b(card|modal|dialog|popup)\b/i,
		/\b(input|form|field|textbox|textarea)\b/i,
		/\b(dropdown|select|menu)\b/i,
		/\b(navbar|navigation|nav)\s*(bar|menu|component)?/i,
		/\b(sidebar|drawer)\b/i,
		/\b(table|list|grid)\s*(component|view)?/i,
		/\b(avatar|badge|chip|tag|pill)\b/i,
		/\b(tooltip|popover)\b/i,
		/\b(tabs?|accordion|collapse)\b/i,
		/\b(alert|toast|notification|snackbar)\b/i,
		/\b(spinner|loader|loading|skeleton)\b/i,
		/\b(breadcrumb|pagination)\b/i,
		/\b(progress|slider|range)\s*(bar|indicator)?/i,
		/\b(checkbox|radio|toggle|switch)\b/i,
		/\b(icon|logo)\b/i,
	]

	// Check for app patterns first (highest priority)
	for (const pattern of appPatterns) {
		const match = lower.match(pattern)
		if (match) {
			keywords.push(match[0])
			return { intent: 'app', keywords }
		}
	}

	// Check for page patterns
	for (const pattern of pagePatterns) {
		const match = lower.match(pattern)
		if (match) {
			keywords.push(match[0])
			return { intent: 'page', keywords }
		}
	}

	// Check for section patterns
	for (const pattern of sectionPatterns) {
		const match = lower.match(pattern)
		if (match) {
			keywords.push(match[0])
			return { intent: 'section', keywords }
		}
	}

	// Check for component patterns
	for (const pattern of componentPatterns) {
		const match = lower.match(pattern)
		if (match) {
			keywords.push(match[0])
			return { intent: 'component', keywords }
		}
	}

	// Default heuristics based on complexity
	const wordCount = prompt.split(/\s+/).length
	if (wordCount > 50) {
		return { intent: 'page', keywords: ['complex prompt'] }
	}
	if (wordCount > 20) {
		return { intent: 'section', keywords: ['medium prompt'] }
	}

	// Default to component for simple/unclear prompts
	return { intent: 'component', keywords: ['default'] }
}

/**
 * Parse markdown into a clean prompt
 */
function parseMarkdown(markdown: string): string {
	// Extract headings as main topics
	const headings = markdown.match(/^#+\s+(.+)$/gm) ?? []

	// Extract code blocks as examples
	const codeBlocks = markdown.match(/```[\s\S]*?```/g) ?? []

	// Extract bullet points as requirements
	const bullets = markdown.match(/^[-*]\s+(.+)$/gm) ?? []

	// Build a structured prompt
	const parts: string[] = []

	if (headings.length > 0 && headings[0]) {
		parts.push(`Create a component for: ${headings[0].replace(/^#+\s+/, '')}`)
	}

	if (bullets.length > 0) {
		parts.push('\nRequirements:')
		parts.push(...bullets.slice(0, 10).filter((b): b is string => b !== undefined))
	}

	if (codeBlocks.length > 0 && codeBlocks[0]) {
		parts.push('\nExample code or structure:')
		parts.push(codeBlocks[0])
	}

	// If nothing structured found, use the raw markdown
	if (parts.length === 0) {
		return `Create a UI component based on this description:\n\n${markdown}`
	}

	return parts.join('\n')
}

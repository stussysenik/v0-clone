import { type PipelineInput, devLog, now } from '@v0-clone/shared'

export interface ParsedInput {
	type: PipelineInput['type']
	prompt: string
	metadata: {
		hasImages: boolean
		wordCount: number
		estimatedComplexity: 'simple' | 'medium' | 'complex'
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

	const result: ParsedInput = {
		type: input.type,
		prompt,
		metadata: {
			hasImages,
			wordCount,
			estimatedComplexity,
		},
	}

	const durationMs = now() - startTime
	devLog('pipeline', 'Parse stage completed', { durationMs, ...result.metadata })

	return result
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

	if (headings.length > 0) {
		parts.push(`Create a component for: ${headings[0].replace(/^#+\s+/, '')}`)
	}

	if (bullets.length > 0) {
		parts.push('\nRequirements:')
		parts.push(...bullets.slice(0, 10)) // Limit to 10 bullets
	}

	if (codeBlocks.length > 0) {
		parts.push('\nExample code or structure:')
		parts.push(codeBlocks[0])
	}

	// If nothing structured found, use the raw markdown
	if (parts.length === 0) {
		return `Create a UI component based on this description:\n\n${markdown}`
	}

	return parts.join('\n')
}

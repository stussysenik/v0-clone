import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import type { FigmaDesignTokens, FigmaImportResult } from '@v0-clone/shared'

// Figma API base URL
const FIGMA_API_BASE = 'https://api.figma.com/v1'

/**
 * Extract design tokens from a Figma file
 * POST /api/figma/extract
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { fileKey, nodeId } = await request.json()

		if (!fileKey) {
			return json({ error: 'File key is required' }, { status: 400 })
		}

		// Get Figma access token from environment
		const accessToken = process.env.FIGMA_ACCESS_TOKEN

		if (!accessToken) {
			return json(
				{
					success: false,
					tokens: null,
					warnings: ['Figma access token not configured'],
					errors: ['FIGMA_ACCESS_TOKEN environment variable is not set'],
				} satisfies FigmaImportResult,
				{ status: 200 }
			)
		}

		// Fetch file data from Figma API
		const fileUrl = nodeId
			? `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}`
			: `${FIGMA_API_BASE}/files/${fileKey}`

		const fileResponse = await fetch(fileUrl, {
			headers: {
				'X-Figma-Token': accessToken,
			},
		})

		if (!fileResponse.ok) {
			const error = await fileResponse.text()
			return json(
				{
					success: false,
					tokens: null,
					warnings: [],
					errors: [`Figma API error: ${fileResponse.status} - ${error}`],
				} satisfies FigmaImportResult,
				{ status: 200 }
			)
		}

		const fileData = await fileResponse.json()

		// Fetch styles from Figma
		const stylesResponse = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/styles`, {
			headers: {
				'X-Figma-Token': accessToken,
			},
		})

		let stylesData = null
		if (stylesResponse.ok) {
			stylesData = await stylesResponse.json()
		}

		// Extract tokens from Figma data
		const result = extractTokensFromFigma(fileKey, fileData, stylesData)

		return json(result)
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error'
		return json(
			{
				success: false,
				tokens: null,
				warnings: [],
				errors: [message],
			} satisfies FigmaImportResult,
			{ status: 500 }
		)
	}
}

/**
 * Extract design tokens from Figma file data
 */
function extractTokensFromFigma(
	fileKey: string,
	fileData: FigmaFileData,
	stylesData: FigmaStylesData | null
): FigmaImportResult {
	const warnings: string[] = []
	const errors: string[] = []

	const tokens: FigmaDesignTokens = {
		colors: {
			primary: {},
			secondary: {},
			neutral: {},
			semantic: {},
			custom: {},
		},
		spacing: {},
		typography: {
			fontFamilies: [],
			fontSizes: {},
			fontWeights: {},
			lineHeights: {},
			textStyles: {},
		},
		shadows: {},
		borderRadii: {},
		breakpoints: {
			sm: 640,
			md: 768,
			lg: 1024,
			xl: 1280,
		},
		source: {
			fileKey,
			fileName: fileData.name || 'Unknown',
			extractedAt: Date.now(),
		},
	}

	// Extract colors from styles
	if (stylesData?.meta?.styles) {
		const colorStyles = stylesData.meta.styles.filter(
			(s: FigmaStyle) => s.style_type === 'FILL'
		)

		for (const style of colorStyles) {
			const colorName = style.name.toLowerCase()
			const color = {
				name: style.name,
				value: '#000000', // Will be overwritten if we can get the actual value
				description: style.description,
			}

			// Categorize by name
			if (colorName.includes('primary')) {
				tokens.colors.primary[style.name] = color
			} else if (colorName.includes('secondary')) {
				tokens.colors.secondary[style.name] = color
			} else if (colorName.includes('neutral') || colorName.includes('gray') || colorName.includes('grey')) {
				tokens.colors.neutral[style.name] = color
			} else if (
				colorName.includes('success') ||
				colorName.includes('error') ||
				colorName.includes('warning') ||
				colorName.includes('info')
			) {
				tokens.colors.semantic[style.name] = color
			} else {
				tokens.colors.custom[style.name] = color
			}
		}

		// Extract text styles
		const textStyles = stylesData.meta.styles.filter(
			(s: FigmaStyle) => s.style_type === 'TEXT'
		)

		for (const style of textStyles) {
			tokens.typography.textStyles[style.name] = {
				name: style.name,
				fontFamily: 'Inter', // Default, would need node data for actual value
				fontSize: 16,
				fontWeight: 400,
				lineHeight: 1.5,
			}
		}

		// Extract effect styles (shadows)
		const effectStyles = stylesData.meta.styles.filter(
			(s: FigmaStyle) => s.style_type === 'EFFECT'
		)

		for (const style of effectStyles) {
			tokens.shadows[style.name] = {
				name: style.name,
				x: 0,
				y: 4,
				blur: 8,
				spread: 0,
				color: 'rgba(0,0,0,0.1)',
			}
		}
	}

	// Extract data from document tree
	if (fileData.document) {
		extractFromNode(fileData.document, tokens, warnings)
	}

	// Deduplicate font families
	tokens.typography.fontFamilies = [...new Set(tokens.typography.fontFamilies)]

	// Check if we extracted anything useful
	const hasColors =
		Object.keys(tokens.colors.primary).length > 0 ||
		Object.keys(tokens.colors.secondary).length > 0 ||
		Object.keys(tokens.colors.custom).length > 0

	const hasTypography = tokens.typography.fontFamilies.length > 0

	if (!hasColors && !hasTypography) {
		warnings.push('No design tokens found in the file. Make sure the file has published styles.')
	}

	return {
		success: errors.length === 0,
		tokens,
		warnings,
		errors,
	}
}

/**
 * Recursively extract data from Figma nodes
 */
function extractFromNode(
	node: FigmaNode,
	tokens: FigmaDesignTokens,
	warnings: string[],
	depth = 0
): void {
	// Limit recursion depth
	if (depth > 10) return

	// Extract font family if it's a text node
	if (node.type === 'TEXT' && node.style?.fontFamily) {
		if (!tokens.typography.fontFamilies.includes(node.style.fontFamily)) {
			tokens.typography.fontFamilies.push(node.style.fontFamily)
		}

		// Extract font sizes
		if (node.style.fontSize) {
			const sizeName = `text-${node.style.fontSize}`
			tokens.typography.fontSizes[sizeName] = node.style.fontSize
		}
	}

	// Extract fills as colors
	if (node.fills && Array.isArray(node.fills)) {
		for (const fill of node.fills) {
			if (fill.type === 'SOLID' && fill.color) {
				const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b)
				const colorName = node.name || `color-${hex}`
				tokens.colors.custom[colorName] = {
					name: colorName,
					value: hex,
					opacity: fill.opacity,
				}
			}
		}
	}

	// Extract corner radius
	if (node.cornerRadius !== undefined && node.cornerRadius > 0) {
		const radiusName = `radius-${node.cornerRadius}`
		tokens.borderRadii[radiusName] = {
			name: radiusName,
			value: node.cornerRadius,
		}
	}

	// Extract spacing from auto-layout
	if (node.itemSpacing !== undefined && node.itemSpacing > 0) {
		const spacingName = `space-${node.itemSpacing}`
		tokens.spacing[spacingName] = {
			name: spacingName,
			value: node.itemSpacing,
			unit: 'px',
		}
	}

	// Recurse into children
	if (node.children) {
		for (const child of node.children) {
			extractFromNode(child, tokens, warnings, depth + 1)
		}
	}
}

/**
 * Convert RGB values (0-1) to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (v: number) => {
		const hex = Math.round(v * 255).toString(16)
		return hex.length === 1 ? '0' + hex : hex
	}
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// =============================================================================
// Type definitions for Figma API responses
// =============================================================================

interface FigmaFileData {
	name?: string
	document?: FigmaNode
}

interface FigmaNode {
	type: string
	name?: string
	style?: {
		fontFamily?: string
		fontSize?: number
		fontWeight?: number
	}
	fills?: Array<{
		type: string
		color?: { r: number; g: number; b: number }
		opacity?: number
	}>
	cornerRadius?: number
	itemSpacing?: number
	children?: FigmaNode[]
}

interface FigmaStylesData {
	meta?: {
		styles?: FigmaStyle[]
	}
}

interface FigmaStyle {
	key: string
	name: string
	description?: string
	style_type: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID'
}

/**
 * Code Sync Utility
 *
 * Provides two-way synchronization between visual element edits and code.
 * Uses data-oid (object ID) attributes to map DOM elements to code positions.
 */

export interface CodeLocation {
	start: number
	end: number
	line: number
	column: number
}

export interface ElementMapping {
	oid: string
	tagName: string
	location: CodeLocation
	classLocation?: CodeLocation
	styleLocation?: CodeLocation
	attributes: Record<string, CodeLocation>
}

export interface StyleUpdate {
	property: string
	value: string
	oid?: string
}

/**
 * Generate a unique OID for an element
 */
export function generateOid(): string {
	return `e${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`
}

/**
 * Add data-oid attributes to HTML/Svelte code for element tracking
 */
export function addOidAttributes(code: string): string {
	// Match opening HTML tags (not self-closing, not script/style)
	const tagRegex = /<([a-z][a-z0-9-]*)((?:\s+[^>]*)?)\s*>/gi

	let result = code
	let offset = 0

	// Find all tags and add data-oid if not present
	const matches = [...code.matchAll(tagRegex)]

	for (const match of matches) {
		const tagName = match[1].toLowerCase()

		// Skip script, style, and svelte special tags
		if (['script', 'style', 'svelte:head', 'svelte:body', 'svelte:window', 'svelte:document'].includes(tagName)) {
			continue
		}

		// Skip if already has data-oid
		if (match[0].includes('data-oid=')) {
			continue
		}

		const oid = generateOid()
		const insertPosition = match.index! + offset + match[1].length + 1 // After the tag name

		// Insert the data-oid attribute
		const oidAttr = ` data-oid="${oid}"`
		result = result.slice(0, insertPosition) + oidAttr + result.slice(insertPosition)
		offset += oidAttr.length
	}

	return result
}

/**
 * Parse code to extract element mappings
 */
export function parseElementMappings(code: string): Map<string, ElementMapping> {
	const mappings = new Map<string, ElementMapping>()

	// Match tags with data-oid attribute
	const oidTagRegex = /<([a-z][a-z0-9-]*)\s+([^>]*data-oid="([^"]+)"[^>]*)\s*>/gi

	let match
	while ((match = oidTagRegex.exec(code)) !== null) {
		const [fullMatch, tagName, attributes, oid] = match
		const startIndex = match.index
		const endIndex = startIndex + fullMatch.length

		// Calculate line and column
		const beforeMatch = code.substring(0, startIndex)
		const lines = beforeMatch.split('\n')
		const line = lines.length
		const column = lines[lines.length - 1].length

		// Find class attribute location
		let classLocation: CodeLocation | undefined
		const classMatch = attributes.match(/class="([^"]*)"/)
		if (classMatch) {
			const classStart = startIndex + fullMatch.indexOf(classMatch[0])
			const beforeClass = code.substring(0, classStart)
			const classLines = beforeClass.split('\n')
			classLocation = {
				start: classStart,
				end: classStart + classMatch[0].length,
				line: classLines.length,
				column: classLines[classLines.length - 1].length,
			}
		}

		// Find style attribute location
		let styleLocation: CodeLocation | undefined
		const styleMatch = attributes.match(/style="([^"]*)"/)
		if (styleMatch) {
			const styleStart = startIndex + fullMatch.indexOf(styleMatch[0])
			const beforeStyle = code.substring(0, styleStart)
			const styleLines = beforeStyle.split('\n')
			styleLocation = {
				start: styleStart,
				end: styleStart + styleMatch[0].length,
				line: styleLines.length,
				column: styleLines[styleLines.length - 1].length,
			}
		}

		mappings.set(oid, {
			oid,
			tagName: tagName.toLowerCase(),
			location: {
				start: startIndex,
				end: endIndex,
				line,
				column,
			},
			classLocation,
			styleLocation,
			attributes: {},
		})
	}

	return mappings
}

/**
 * Apply a style update to code
 */
export function applyStyleUpdate(code: string, update: StyleUpdate, oid: string): string {
	const mappings = parseElementMappings(code)
	const mapping = mappings.get(oid)

	if (!mapping) {
		console.warn(`Element with oid ${oid} not found in code`)
		return code
	}

	const { property, value } = update

	// Convert camelCase to kebab-case for CSS
	const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase()

	if (mapping.styleLocation) {
		// Update existing style attribute
		const styleMatch = code.substring(mapping.styleLocation.start, mapping.styleLocation.end)
		const existingStyles = styleMatch.match(/style="([^"]*)"/)

		if (existingStyles) {
			let styles = existingStyles[1]

			// Parse existing styles
			const styleMap = new Map<string, string>()
			styles.split(';').forEach(s => {
				const [prop, val] = s.split(':').map(x => x.trim())
				if (prop && val) {
					styleMap.set(prop, val)
				}
			})

			// Update or add the property
			styleMap.set(cssProperty, value)

			// Rebuild styles string
			const newStyles = Array.from(styleMap.entries())
				.map(([p, v]) => `${p}: ${v}`)
				.join('; ')

			const newStyleAttr = `style="${newStyles}"`

			return (
				code.substring(0, mapping.styleLocation.start) +
				newStyleAttr +
				code.substring(mapping.styleLocation.end)
			)
		}
	} else {
		// No style attribute exists, add one before the closing >
		const tagEnd = mapping.location.end - 1
		const newStyleAttr = ` style="${cssProperty}: ${value}"`

		return (
			code.substring(0, tagEnd) +
			newStyleAttr +
			code.substring(tagEnd)
		)
	}

	return code
}

/**
 * Apply a Tailwind class update to code
 */
export function applyTailwindUpdate(
	code: string,
	oid: string,
	addClasses: string[] = [],
	removeClasses: string[] = []
): string {
	const mappings = parseElementMappings(code)
	const mapping = mappings.get(oid)

	if (!mapping) {
		console.warn(`Element with oid ${oid} not found in code`)
		return code
	}

	if (mapping.classLocation) {
		// Update existing class attribute
		const classMatch = code.substring(mapping.classLocation.start, mapping.classLocation.end)
		const existingClasses = classMatch.match(/class="([^"]*)"/)

		if (existingClasses) {
			const classSet = new Set(existingClasses[1].split(/\s+/).filter(Boolean))

			// Remove classes
			removeClasses.forEach(c => classSet.delete(c))

			// Add classes
			addClasses.forEach(c => classSet.add(c))

			const newClassAttr = `class="${Array.from(classSet).join(' ')}"`

			return (
				code.substring(0, mapping.classLocation.start) +
				newClassAttr +
				code.substring(mapping.classLocation.end)
			)
		}
	} else if (addClasses.length > 0) {
		// No class attribute exists, add one before the closing >
		const tagEnd = mapping.location.end - 1
		const newClassAttr = ` class="${addClasses.join(' ')}"`

		return (
			code.substring(0, tagEnd) +
			newClassAttr +
			code.substring(tagEnd)
		)
	}

	return code
}

/**
 * Convert a CSS property + value to Tailwind classes
 */
export function cssToTailwind(property: string, value: string): string[] {
	const classes: string[] = []

	// Common conversions
	const conversions: Record<string, (v: string) => string[]> = {
		color: (v) => {
			// Try to match common colors
			const hexMatch = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i)
			if (hexMatch) {
				// Use arbitrary value
				return [`text-[${v}]`]
			}
			return []
		},
		backgroundColor: (v) => {
			const hexMatch = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i)
			if (hexMatch) {
				return [`bg-[${v}]`]
			}
			return []
		},
		fontSize: (v) => {
			const pxMatch = v.match(/(\d+)px/)
			if (pxMatch) {
				const px = parseInt(pxMatch[1])
				// Map to Tailwind text sizes
				if (px <= 12) return ['text-xs']
				if (px <= 14) return ['text-sm']
				if (px <= 16) return ['text-base']
				if (px <= 18) return ['text-lg']
				if (px <= 20) return ['text-xl']
				if (px <= 24) return ['text-2xl']
				if (px <= 30) return ['text-3xl']
				if (px <= 36) return ['text-4xl']
				return [`text-[${v}]`]
			}
			return []
		},
		fontWeight: (v) => {
			const weightMap: Record<string, string> = {
				'100': 'font-thin',
				'200': 'font-extralight',
				'300': 'font-light',
				'400': 'font-normal',
				'500': 'font-medium',
				'600': 'font-semibold',
				'700': 'font-bold',
				'800': 'font-extrabold',
				'900': 'font-black',
			}
			return weightMap[v] ? [weightMap[v]] : []
		},
		padding: (v) => {
			const pxMatch = v.match(/(\d+)px/)
			if (pxMatch) {
				const px = parseInt(pxMatch[1])
				const tw = Math.round(px / 4)
				return [`p-${tw}`]
			}
			return []
		},
		margin: (v) => {
			const pxMatch = v.match(/(\d+)px/)
			if (pxMatch) {
				const px = parseInt(pxMatch[1])
				const tw = Math.round(px / 4)
				return [`m-${tw}`]
			}
			return []
		},
		borderRadius: (v) => {
			const pxMatch = v.match(/(\d+)px/)
			if (pxMatch) {
				const px = parseInt(pxMatch[1])
				if (px === 0) return ['rounded-none']
				if (px <= 2) return ['rounded-sm']
				if (px <= 4) return ['rounded']
				if (px <= 6) return ['rounded-md']
				if (px <= 8) return ['rounded-lg']
				if (px <= 12) return ['rounded-xl']
				if (px <= 16) return ['rounded-2xl']
				if (px <= 24) return ['rounded-3xl']
				if (px >= 9999) return ['rounded-full']
				return [`rounded-[${v}]`]
			}
			return []
		},
		display: (v) => {
			const displayMap: Record<string, string> = {
				'block': 'block',
				'inline-block': 'inline-block',
				'inline': 'inline',
				'flex': 'flex',
				'inline-flex': 'inline-flex',
				'grid': 'grid',
				'inline-grid': 'inline-grid',
				'none': 'hidden',
			}
			return displayMap[v] ? [displayMap[v]] : []
		},
	}

	const converter = conversions[property]
	if (converter) {
		classes.push(...converter(value))
	}

	return classes
}

/**
 * Find the element in code by OID and return surrounding context
 */
export function getCodeContext(code: string, oid: string, contextLines: number = 3): string | null {
	const mappings = parseElementMappings(code)
	const mapping = mappings.get(oid)

	if (!mapping) {
		return null
	}

	const lines = code.split('\n')
	const startLine = Math.max(0, mapping.location.line - contextLines - 1)
	const endLine = Math.min(lines.length, mapping.location.line + contextLines)

	return lines.slice(startLine, endLine).join('\n')
}

export default {
	generateOid,
	addOidAttributes,
	parseElementMappings,
	applyStyleUpdate,
	applyTailwindUpdate,
	cssToTailwind,
	getCodeContext,
}

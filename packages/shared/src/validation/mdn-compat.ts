/**
 * MDN Compatibility Checker
 * Validates CSS properties and HTML attributes against browser support data
 */

import type { CSSPropertyCompat, BrowserSupport, ValidationIssue } from '../types'

// =============================================================================
// Static Compatibility Data (subset of MDN compat data)
// =============================================================================

const DEPRECATED_CSS_PROPERTIES: Record<string, { alternative: string; mdnUrl: string }> = {
	'-webkit-appearance': {
		alternative: 'appearance',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/appearance',
	},
	'-moz-appearance': {
		alternative: 'appearance',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/appearance',
	},
	'-webkit-box-orient': {
		alternative: 'flex-direction',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/flex-direction',
	},
	'-webkit-box-pack': {
		alternative: 'justify-content',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/justify-content',
	},
	'-webkit-box-align': {
		alternative: 'align-items',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/align-items',
	},
	'box-sizing': {
		alternative: 'box-sizing (standard, but check for old -webkit- prefix)',
		mdnUrl: 'https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing',
	},
}

const EXPERIMENTAL_CSS_PROPERTIES: Set<string> = new Set([
	'container',
	'container-name',
	'container-type',
	'text-wrap',
	'text-wrap-mode',
	'text-wrap-style',
	'anchor-name',
	'position-anchor',
	'inset-area',
	'view-transition-name',
	'timeline-scope',
	'scroll-timeline',
	'animation-timeline',
])

// Minimum browser versions for 90%+ support threshold
const CSS_PROPERTY_SUPPORT: Record<string, BrowserSupport> = {
	'gap': { chrome: 84, firefox: 63, safari: 14.1, edge: 84, ie: null },
	'aspect-ratio': { chrome: 88, firefox: 89, safari: 15, edge: 88, ie: null },
	'grid': { chrome: 57, firefox: 52, safari: 10.1, edge: 16, ie: null },
	'grid-template-columns': { chrome: 57, firefox: 52, safari: 10.1, edge: 16, ie: null },
	'grid-template-rows': { chrome: 57, firefox: 52, safari: 10.1, edge: 16, ie: null },
	'flex': { chrome: 29, firefox: 28, safari: 9, edge: 12, ie: 11 },
	'flexbox': { chrome: 29, firefox: 28, safari: 9, edge: 12, ie: 11 },
	'container-queries': { chrome: 105, firefox: 110, safari: 16, edge: 105, ie: null },
	'has': { chrome: 105, firefox: 121, safari: 15.4, edge: 105, ie: null },
	'clamp': { chrome: 79, firefox: 75, safari: 13.1, edge: 79, ie: null },
	'min': { chrome: 79, firefox: 75, safari: 11.1, edge: 79, ie: null },
	'max': { chrome: 79, firefox: 75, safari: 11.1, edge: 79, ie: null },
	'color-scheme': { chrome: 81, firefox: 96, safari: 13, edge: 81, ie: null },
	'accent-color': { chrome: 93, firefox: 92, safari: 15.4, edge: 93, ie: null },
	'inset': { chrome: 87, firefox: 66, safari: 14.1, edge: 87, ie: null },
	'backdrop-filter': { chrome: 76, firefox: 103, safari: 9, edge: 17, ie: null },
	'scroll-behavior': { chrome: 61, firefox: 36, safari: 15.4, edge: 79, ie: null },
	'scroll-snap-type': { chrome: 69, firefox: 99, safari: 11, edge: 79, ie: null },
	'overscroll-behavior': { chrome: 63, firefox: 59, safari: 16, edge: 18, ie: null },
	'text-decoration-thickness': { chrome: 89, firefox: 70, safari: 12.1, edge: 89, ie: null },
	'text-underline-offset': { chrome: 87, firefox: 70, safari: 12.1, edge: 87, ie: null },
}

const DEPRECATED_HTML_ATTRIBUTES: Record<string, { element?: string; alternative: string }> = {
	'align': { alternative: 'CSS text-align or flexbox' },
	'bgcolor': { alternative: 'CSS background-color' },
	'border': { element: 'table', alternative: 'CSS border' },
	'cellpadding': { element: 'table', alternative: 'CSS padding on cells' },
	'cellspacing': { element: 'table', alternative: 'CSS border-spacing' },
	'width': { alternative: 'CSS width (except for canvas, img, video)' },
	'height': { alternative: 'CSS height (except for canvas, img, video)' },
	'valign': { alternative: 'CSS vertical-align' },
	'hspace': { alternative: 'CSS margin' },
	'vspace': { alternative: 'CSS margin' },
	'nowrap': { alternative: 'CSS white-space: nowrap' },
	'frameborder': { element: 'iframe', alternative: 'CSS border' },
	'scrolling': { element: 'iframe', alternative: 'CSS overflow' },
	'marginwidth': { element: 'iframe', alternative: 'CSS margin' },
	'marginheight': { element: 'iframe', alternative: 'CSS margin' },
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check a CSS property for compatibility issues
 */
export function checkCSSProperty(property: string): CSSPropertyCompat {
	const normalizedProperty = property.toLowerCase().trim()

	// Check if deprecated
	const deprecatedInfo = DEPRECATED_CSS_PROPERTIES[normalizedProperty]
	if (deprecatedInfo) {
		return {
			property: normalizedProperty,
			standard: false,
			deprecated: true,
			experimental: false,
			support: { chrome: null, firefox: null, safari: null, edge: null, ie: null },
			alternatives: [deprecatedInfo.alternative],
		}
	}

	// Check if experimental
	const isExperimental = EXPERIMENTAL_CSS_PROPERTIES.has(normalizedProperty)

	// Get support info if available
	const support = CSS_PROPERTY_SUPPORT[normalizedProperty] ?? {
		chrome: 1,
		firefox: 1,
		safari: 1,
		edge: 12,
		ie: 9,
	}

	return {
		property: normalizedProperty,
		standard: true,
		deprecated: false,
		experimental: isExperimental,
		support,
	}
}

/**
 * Extract CSS properties from a CSS string
 */
function extractCSSProperties(css: string): Array<{ property: string; line: number; column: number }> {
	const properties: Array<{ property: string; line: number; column: number }> = []
	const lines = css.split('\n')

	lines.forEach((line, lineIndex) => {
		// Match property declarations: property: value
		const propertyRegex = /([a-z-]+)\s*:/gi
		let match

		while ((match = propertyRegex.exec(line)) !== null) {
			properties.push({
				property: match[1],
				line: lineIndex + 1,
				column: match.index + 1,
			})
		}
	})

	return properties
}

/**
 * Extract HTML attributes from HTML string
 */
function extractHTMLAttributes(html: string): Array<{ attribute: string; element: string; line: number }> {
	const attributes: Array<{ attribute: string; element: string; line: number }> = []
	const lines = html.split('\n')

	lines.forEach((line, lineIndex) => {
		// Match element with attributes: <element attr="value">
		const elementRegex = /<(\w+)([^>]*)>/gi
		let elementMatch

		while ((elementMatch = elementRegex.exec(line)) !== null) {
			const element = elementMatch[1].toLowerCase()
			const attributesPart = elementMatch[2]

			// Extract individual attributes
			const attrRegex = /\s(\w+)(?:=|>|\s)/g
			let attrMatch

			while ((attrMatch = attrRegex.exec(attributesPart)) !== null) {
				attributes.push({
					attribute: attrMatch[1].toLowerCase(),
					element,
					line: lineIndex + 1,
				})
			}
		}
	})

	return attributes
}

/**
 * Validate CSS for compatibility issues
 */
export function validateCSS(css: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []
	const properties = extractCSSProperties(css)

	for (const { property, line, column } of properties) {
		const compat = checkCSSProperty(property)

		if (compat.deprecated) {
			const deprecatedInfo = DEPRECATED_CSS_PROPERTIES[property]
			issues.push({
				type: 'deprecated',
				severity: 'warning',
				message: `Deprecated CSS property: ${property}`,
				line,
				column,
				rule: 'mdn-compat/deprecated-css',
				suggestion: `Use '${deprecatedInfo?.alternative}' instead`,
				mdnUrl: deprecatedInfo?.mdnUrl,
			})
		}

		if (compat.experimental) {
			issues.push({
				type: 'compat',
				severity: 'info',
				message: `Experimental CSS property: ${property}`,
				line,
				column,
				rule: 'mdn-compat/experimental-css',
				suggestion: 'Check browser support before using in production',
			})
		}

		// Check for vendor prefixes that may not be needed
		if (property.startsWith('-webkit-') || property.startsWith('-moz-') || property.startsWith('-ms-')) {
			const unprefixed = property.replace(/^-(?:webkit|moz|ms)-/, '')
			const unprefixedCompat = CSS_PROPERTY_SUPPORT[unprefixed]

			if (unprefixedCompat && unprefixedCompat.chrome && unprefixedCompat.chrome < 90) {
				issues.push({
					type: 'compat',
					severity: 'info',
					message: `Vendor prefix may not be needed: ${property}`,
					line,
					column,
					rule: 'mdn-compat/unnecessary-prefix',
					suggestion: `Standard '${unprefixed}' has good browser support`,
				})
			}
		}
	}

	return issues
}

/**
 * Validate HTML for deprecated attributes
 */
export function validateHTML(html: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []
	const attributes = extractHTMLAttributes(html)

	for (const { attribute, element, line } of attributes) {
		const deprecatedInfo = DEPRECATED_HTML_ATTRIBUTES[attribute]

		if (deprecatedInfo) {
			// Check if it's element-specific
			if (!deprecatedInfo.element || deprecatedInfo.element === element) {
				issues.push({
					type: 'deprecated',
					severity: 'warning',
					message: `Deprecated HTML attribute: ${attribute} on <${element}>`,
					line,
					rule: 'mdn-compat/deprecated-html',
					suggestion: `Use ${deprecatedInfo.alternative}`,
				})
			}
		}
	}

	return issues
}

/**
 * Calculate browser support coverage percentage
 */
export function calculateSupportCoverage(support: BrowserSupport): number {
	// Weighted browser usage (approximate global market share)
	const weights = {
		chrome: 0.65,
		firefox: 0.03,
		safari: 0.19,
		edge: 0.05,
		ie: 0.01, // Almost negligible now
	}

	let coverage = 0

	// Chrome
	if (support.chrome !== null && support.chrome <= 100) coverage += weights.chrome
	// Firefox
	if (support.firefox !== null && support.firefox <= 100) coverage += weights.firefox
	// Safari
	if (support.safari !== null && support.safari <= 17) coverage += weights.safari
	// Edge
	if (support.edge !== null && support.edge <= 100) coverage += weights.edge
	// IE (rarely needed)
	if (support.ie !== null && support.ie <= 11) coverage += weights.ie

	return Math.round(coverage * 100)
}

/**
 * Run full MDN compatibility check
 */
export function runMDNCompatCheck(code: { html?: string; css?: string }): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	if (code.html) {
		issues.push(...validateHTML(code.html))
	}

	if (code.css) {
		issues.push(...validateCSS(code.css))
	}

	return issues
}

export default {
	checkCSSProperty,
	validateCSS,
	validateHTML,
	calculateSupportCoverage,
	runMDNCompatCheck,
}

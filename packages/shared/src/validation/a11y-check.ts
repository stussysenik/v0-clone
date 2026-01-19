/**
 * Accessibility (A11y) Checker
 * WCAG 2.1 AA compliance validation
 */

import type { ValidationIssue } from '../types'

// =============================================================================
// Color Contrast Utilities
// =============================================================================

/**
 * Parse a color string to RGB values
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
	// Handle hex colors
	const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
	if (hexMatch) {
		return {
			r: parseInt(hexMatch[1], 16),
			g: parseInt(hexMatch[2], 16),
			b: parseInt(hexMatch[3], 16),
		}
	}

	// Handle short hex colors
	const shortHexMatch = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
	if (shortHexMatch) {
		return {
			r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
			g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
			b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
		}
	}

	// Handle rgb/rgba
	const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
	if (rgbMatch) {
		return {
			r: parseInt(rgbMatch[1], 10),
			g: parseInt(rgbMatch[2], 10),
			b: parseInt(rgbMatch[3], 10),
		}
	}

	// Named colors (common ones)
	const namedColors: Record<string, { r: number; g: number; b: number }> = {
		white: { r: 255, g: 255, b: 255 },
		black: { r: 0, g: 0, b: 0 },
		red: { r: 255, g: 0, b: 0 },
		green: { r: 0, g: 128, b: 0 },
		blue: { r: 0, g: 0, b: 255 },
		gray: { r: 128, g: 128, b: 128 },
		grey: { r: 128, g: 128, b: 128 },
	}

	return namedColors[color.toLowerCase()] ?? null
}

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
	const [rs, gs, bs] = [r, g, b].map(c => {
		c = c / 255
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
	})
	return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number | null {
	const c1 = parseColor(color1)
	const c2 = parseColor(color2)

	if (!c1 || !c2) return null

	const l1 = getLuminance(c1.r, c1.g, c1.b)
	const l2 = getLuminance(c2.r, c2.g, c2.b)

	const lighter = Math.max(l1, l2)
	const darker = Math.min(l1, l2)

	return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast meets WCAG AA requirements
 * Normal text: 4.5:1
 * Large text (18pt+ or 14pt+ bold): 3:1
 */
export function meetsContrastRequirements(
	ratio: number,
	isLargeText: boolean = false,
): boolean {
	return isLargeText ? ratio >= 3 : ratio >= 4.5
}

// =============================================================================
// A11y Rules
// =============================================================================

interface A11yRule {
	id: string
	wcag: string
	severity: 'error' | 'warning' | 'info'
	check: (html: string, css?: string) => ValidationIssue[]
}

/**
 * Rule: Images must have alt attributes
 */
const imgAltRule: A11yRule = {
	id: 'a11y/img-alt',
	wcag: '1.1.1',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const imgRegex = /<img([^>]*)>/gi
		let match

		while ((match = imgRegex.exec(html)) !== null) {
			const attributes = match[1]

			// Check for alt attribute
			if (!/\balt\s*=/i.test(attributes)) {
				issues.push({
					type: 'a11y',
					severity: 'error',
					message: 'Image is missing alt attribute',
					rule: 'a11y/img-alt',
					suggestion: 'Add alt="" for decorative images or descriptive alt text for meaningful images',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Form inputs should have labels
 */
const formLabelRule: A11yRule = {
	id: 'a11y/form-label',
	wcag: '1.3.1',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []

		// Find all inputs that need labels
		const inputRegex = /<input([^>]*)>/gi
		let match

		while ((match = inputRegex.exec(html)) !== null) {
			const attributes = match[1]
			const typeMatch = attributes.match(/type\s*=\s*["']?(\w+)/i)
			const type = typeMatch?.[1]?.toLowerCase() ?? 'text'

			// Skip hidden, submit, button, image, reset
			if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) {
				continue
			}

			// Check for id attribute
			const idMatch = attributes.match(/\bid\s*=\s*["']?([^"'\s>]+)/i)
			const id = idMatch?.[1]

			if (!id) {
				// No id means can't be associated with label
				if (!/aria-label\s*=/i.test(attributes) && !/aria-labelledby\s*=/i.test(attributes)) {
					issues.push({
						type: 'a11y',
						severity: 'error',
						message: `Form input (type="${type}") is missing a label`,
						rule: 'a11y/form-label',
						suggestion: 'Add an id attribute and associate with a <label for="id">',
					})
				}
			} else {
				// Check if there's a label for this id
				const labelRegex = new RegExp(`<label[^>]*for\\s*=\\s*["']?${id}["']?`, 'i')
				if (!labelRegex.test(html) && !/aria-label\s*=/i.test(attributes)) {
					issues.push({
						type: 'a11y',
						severity: 'warning',
						message: `Form input (id="${id}") may be missing an associated label`,
						rule: 'a11y/form-label',
						suggestion: `Add <label for="${id}">Label text</label>`,
					})
				}
			}
		}

		return issues
	},
}

/**
 * Rule: Buttons should have accessible names
 */
const buttonNameRule: A11yRule = {
	id: 'a11y/button-name',
	wcag: '4.1.2',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const buttonRegex = /<button([^>]*)>([\s\S]*?)<\/button>/gi
		let match

		while ((match = buttonRegex.exec(html)) !== null) {
			const attributes = match[1]
			const content = match[2].trim()

			// Check if button has accessible name
			const hasAriaLabel = /aria-label\s*=\s*["'][^"']+/i.test(attributes)
			const hasAriaLabelledBy = /aria-labelledby\s*=\s*["'][^"']+/i.test(attributes)
			const hasTitle = /\btitle\s*=\s*["'][^"']+/i.test(attributes)
			const hasTextContent = content.replace(/<[^>]*>/g, '').trim().length > 0

			if (!hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !hasTextContent) {
				issues.push({
					type: 'a11y',
					severity: 'error',
					message: 'Button has no accessible name',
					rule: 'a11y/button-name',
					suggestion: 'Add text content or aria-label attribute',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Links should have distinguishable text
 */
const linkTextRule: A11yRule = {
	id: 'a11y/link-text',
	wcag: '2.4.4',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const linkRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi
		let match

		const genericLinkTexts = ['click here', 'here', 'link', 'read more', 'more', 'learn more']

		while ((match = linkRegex.exec(html)) !== null) {
			const attributes = match[1]
			const content = match[2].replace(/<[^>]*>/g, '').trim().toLowerCase()

			// Check for empty links
			if (!content && !/aria-label\s*=/i.test(attributes)) {
				issues.push({
					type: 'a11y',
					severity: 'error',
					message: 'Link has no accessible text',
					rule: 'a11y/link-text',
					suggestion: 'Add descriptive link text or aria-label',
				})
				continue
			}

			// Check for generic link text
			if (genericLinkTexts.includes(content)) {
				issues.push({
					type: 'a11y',
					severity: 'warning',
					message: `Link text "${content}" is not descriptive`,
					rule: 'a11y/link-text',
					suggestion: 'Use descriptive link text that explains the destination',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Document should have a language attribute
 */
const langAttributeRule: A11yRule = {
	id: 'a11y/html-lang',
	wcag: '3.1.1',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		if (/<html[^>]*lang\s*=/i.test(html)) {
			return []
		}

		// Only check for full documents
		if (/<html[\s>]/i.test(html)) {
			return [{
				type: 'a11y',
				severity: 'error',
				message: '<html> element is missing lang attribute',
				rule: 'a11y/html-lang',
				suggestion: 'Add lang="en" (or appropriate language code) to <html>',
			}]
		}

		return []
	},
}

/**
 * Rule: Page should have a title
 */
const titleRule: A11yRule = {
	id: 'a11y/page-title',
	wcag: '2.4.2',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		// Only check for full documents
		if (!/<html[\s>]/i.test(html) && !/<head[\s>]/i.test(html)) {
			return []
		}

		if (!/<title[^>]*>[^<]+<\/title>/i.test(html)) {
			return [{
				type: 'a11y',
				severity: 'error',
				message: 'Document is missing a <title> element',
				rule: 'a11y/page-title',
				suggestion: 'Add a descriptive <title> in the <head>',
			}]
		}

		return []
	},
}

/**
 * Rule: Interactive elements should be focusable
 */
const focusableRule: A11yRule = {
	id: 'a11y/focusable',
	wcag: '2.1.1',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []

		// Check for onclick on non-interactive elements
		const clickableNonInteractive = /<(div|span|p)[^>]*onclick/gi
		if (clickableNonInteractive.test(html)) {
			issues.push({
				type: 'a11y',
				severity: 'warning',
				message: 'Non-interactive element with onclick handler may not be keyboard accessible',
				rule: 'a11y/focusable',
				suggestion: 'Use <button> or add tabindex="0" and keyboard event handlers',
			})
		}

		// Check for tabindex > 0 (anti-pattern)
		if (/tabindex\s*=\s*["']?[1-9]/i.test(html)) {
			issues.push({
				type: 'a11y',
				severity: 'warning',
				message: 'Avoid using tabindex greater than 0',
				rule: 'a11y/focusable',
				suggestion: 'Use tabindex="0" or remove tabindex and rely on document order',
			})
		}

		return issues
	},
}

/**
 * Rule: ARIA roles should be valid
 */
const ariaRoleRule: A11yRule = {
	id: 'a11y/aria-role',
	wcag: '4.1.2',
	severity: 'error',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []

		const validRoles = new Set([
			'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
			'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
			'contentinfo', 'definition', 'dialog', 'directory', 'document',
			'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
			'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
			'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
			'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
			'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
			'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
			'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
			'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
			'treeitem',
		])

		const roleRegex = /role\s*=\s*["']?([^"'\s>]+)/gi
		let match

		while ((match = roleRegex.exec(html)) !== null) {
			const role = match[1].toLowerCase()
			if (!validRoles.has(role)) {
				issues.push({
					type: 'a11y',
					severity: 'error',
					message: `Invalid ARIA role: "${role}"`,
					rule: 'a11y/aria-role',
					suggestion: 'Use a valid ARIA role from the WAI-ARIA specification',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Check for skip link
 */
const skipLinkRule: A11yRule = {
	id: 'a11y/skip-link',
	wcag: '2.4.1',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// Only check for full documents with navigation
		if (!/<nav[\s>]/i.test(html)) {
			return []
		}

		// Look for skip link patterns
		const hasSkipLink = /<a[^>]*href\s*=\s*["']#(?:main|content|skip)/i.test(html) ||
			/<a[^>]*class="[^"]*skip/i.test(html)

		if (!hasSkipLink) {
			return [{
				type: 'a11y',
				severity: 'info',
				message: 'Consider adding a skip navigation link',
				rule: 'a11y/skip-link',
				suggestion: 'Add <a href="#main" class="skip-link">Skip to main content</a> as first focusable element',
			}]
		}

		return []
	},
}

/**
 * Rule: Color alone should not convey information
 */
const colorAloneRule: A11yRule = {
	id: 'a11y/color-alone',
	wcag: '1.4.1',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// This is a heuristic check - look for error/success patterns without icons/text
		const colorOnlyPatterns = [
			/<[^>]*class="[^"]*(?:text-red|text-green|text-error|text-success)[^"]*"[^>]*>[\s\S]{0,50}<\/[^>]*>/gi,
		]

		for (const pattern of colorOnlyPatterns) {
			if (pattern.test(html)) {
				return [{
					type: 'a11y',
					severity: 'info',
					message: 'Ensure color is not the only means of conveying information',
					rule: 'a11y/color-alone',
					suggestion: 'Add icons, text, or patterns alongside color indicators',
				}]
			}
		}

		return []
	},
}

// =============================================================================
// Main Validation Function
// =============================================================================

const ALL_A11Y_RULES: A11yRule[] = [
	imgAltRule,
	formLabelRule,
	buttonNameRule,
	linkTextRule,
	langAttributeRule,
	titleRule,
	focusableRule,
	ariaRoleRule,
	skipLinkRule,
	colorAloneRule,
]

/**
 * Run all accessibility validation rules
 */
export function validateA11y(html: string, css?: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	for (const rule of ALL_A11Y_RULES) {
		try {
			const ruleIssues = rule.check(html, css)
			issues.push(...ruleIssues)
		} catch (err) {
			console.error(`A11y rule ${rule.id} failed:`, err)
		}
	}

	return issues
}

/**
 * Run specific a11y rules
 */
export function validateA11yWithRules(
	html: string,
	ruleIds: string[],
	css?: string,
): ValidationIssue[] {
	const issues: ValidationIssue[] = []
	const rulesToRun = ALL_A11Y_RULES.filter(r => ruleIds.includes(r.id))

	for (const rule of rulesToRun) {
		try {
			const ruleIssues = rule.check(html, css)
			issues.push(...ruleIssues)
		} catch (err) {
			console.error(`A11y rule ${rule.id} failed:`, err)
		}
	}

	return issues
}

/**
 * Get list of available a11y rules
 */
export function getAvailableA11yRules(): Array<{ id: string; wcag: string; severity: string }> {
	return ALL_A11Y_RULES.map(r => ({ id: r.id, wcag: r.wcag, severity: r.severity }))
}

export default {
	validateA11y,
	validateA11yWithRules,
	getAvailableA11yRules,
	getContrastRatio,
	meetsContrastRequirements,
}

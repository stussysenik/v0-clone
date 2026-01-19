/**
 * Semantic HTML Linter
 * Validates HTML structure for semantic correctness and best practices
 */

import type { ValidationIssue } from '../types'

// =============================================================================
// Semantic HTML Rules
// =============================================================================

interface SemanticRule {
	id: string
	severity: 'error' | 'warning' | 'info'
	check: (html: string) => ValidationIssue[]
}

/**
 * Rule: Document should have exactly one <main> element
 */
const mainElementRule: SemanticRule = {
	id: 'semantic/single-main',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		const mainMatches = html.match(/<main[\s>]/gi) ?? []

		if (mainMatches.length === 0) {
			// Check if there's a div that could be main
			if (html.includes('<div') && !html.includes('<main')) {
				return [{
					type: 'semantic',
					severity: 'info',
					message: 'Consider using <main> element for primary content',
					rule: 'semantic/single-main',
					suggestion: 'Replace the primary content <div> with <main> for better semantics',
				}]
			}
		} else if (mainMatches.length > 1) {
			return [{
				type: 'semantic',
				severity: 'warning',
				message: 'Document should have only one <main> element',
				rule: 'semantic/single-main',
				suggestion: 'Combine content into a single <main> element',
			}]
		}

		return []
	},
}

/**
 * Rule: Headings should follow proper hierarchy
 */
const headingHierarchyRule: SemanticRule = {
	id: 'semantic/heading-hierarchy',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const headingRegex = /<h([1-6])[\s>]/gi
		const headings: number[] = []
		let match

		while ((match = headingRegex.exec(html)) !== null) {
			headings.push(parseInt(match[1], 10))
		}

		// Check for proper hierarchy
		if (headings.length > 0) {
			// First heading should ideally be h1
			if (headings[0] !== 1 && !html.includes('<h1')) {
				issues.push({
					type: 'semantic',
					severity: 'info',
					message: 'Document should start with an <h1> element',
					rule: 'semantic/heading-hierarchy',
					suggestion: 'Add an <h1> element as the main heading',
				})
			}

			// Check for skipped heading levels
			for (let i = 1; i < headings.length; i++) {
				if (headings[i] > headings[i - 1] + 1) {
					issues.push({
						type: 'semantic',
						severity: 'warning',
						message: `Heading level skipped: h${headings[i - 1]} to h${headings[i]}`,
						rule: 'semantic/heading-hierarchy',
						suggestion: `Use h${headings[i - 1] + 1} instead of h${headings[i]}`,
					})
				}
			}
		}

		return issues
	},
}

/**
 * Rule: Navigation should use <nav> element
 */
const navigationRule: SemanticRule = {
	id: 'semantic/use-nav',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// Look for navigation-like structures without <nav>
		const hasNav = /<nav[\s>]/i.test(html)
		const hasNavPattern = /<ul[^>]*class="[^"]*nav/i.test(html) ||
			/<div[^>]*class="[^"]*nav/i.test(html) ||
			/<div[^>]*class="[^"]*menu/i.test(html)

		if (hasNavPattern && !hasNav) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'Navigation content should use <nav> element',
				rule: 'semantic/use-nav',
				suggestion: 'Wrap navigation links in a <nav> element',
			}]
		}

		return []
	},
}

/**
 * Rule: Footer content should use <footer> element
 */
const footerRule: SemanticRule = {
	id: 'semantic/use-footer',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		const hasFooter = /<footer[\s>]/i.test(html)
		const hasFooterPattern = /<div[^>]*class="[^"]*footer/i.test(html)

		if (hasFooterPattern && !hasFooter) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'Footer content should use <footer> element',
				rule: 'semantic/use-footer',
				suggestion: 'Replace footer <div> with <footer> element',
			}]
		}

		return []
	},
}

/**
 * Rule: Header content should use <header> element
 */
const headerRule: SemanticRule = {
	id: 'semantic/use-header',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		const hasHeader = /<header[\s>]/i.test(html)
		const hasHeaderPattern = /<div[^>]*class="[^"]*header/i.test(html)

		if (hasHeaderPattern && !hasHeader) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'Header content should use <header> element',
				rule: 'semantic/use-header',
				suggestion: 'Replace header <div> with <header> element',
			}]
		}

		return []
	},
}

/**
 * Rule: Sections should have headings
 */
const sectionHeadingRule: SemanticRule = {
	id: 'semantic/section-heading',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const sectionRegex = /<section[^>]*>([\s\S]*?)<\/section>/gi
		let match

		while ((match = sectionRegex.exec(html)) !== null) {
			const sectionContent = match[1]
			if (!/<h[1-6][\s>]/i.test(sectionContent)) {
				issues.push({
					type: 'semantic',
					severity: 'info',
					message: '<section> element should contain a heading',
					rule: 'semantic/section-heading',
					suggestion: 'Add a heading (h1-h6) to describe the section content',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Articles should be self-contained
 */
const articleRule: SemanticRule = {
	id: 'semantic/article-structure',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []
		const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/gi
		let match

		while ((match = articleRegex.exec(html)) !== null) {
			const articleContent = match[1]

			// Article should have a heading
			if (!/<h[1-6][\s>]/i.test(articleContent)) {
				issues.push({
					type: 'semantic',
					severity: 'info',
					message: '<article> should have a heading for accessibility',
					rule: 'semantic/article-structure',
					suggestion: 'Add a heading to the article element',
				})
			}
		}

		return issues
	},
}

/**
 * Rule: Use <button> for interactive elements, not divs
 */
const buttonRule: SemanticRule = {
	id: 'semantic/use-button',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		const issues: ValidationIssue[] = []

		// Look for clickable divs/spans
		const clickableDivRegex = /<(div|span)[^>]*onclick/gi
		if (clickableDivRegex.test(html)) {
			issues.push({
				type: 'semantic',
				severity: 'warning',
				message: 'Use <button> instead of clickable <div> or <span>',
				rule: 'semantic/use-button',
				suggestion: 'Replace clickable divs/spans with <button> elements for accessibility',
			})
		}

		// Look for divs with button-like classes
		const buttonClassRegex = /<(div|span)[^>]*class="[^"]*btn[^"]*"/gi
		if (buttonClassRegex.test(html) && !/<button/i.test(html)) {
			issues.push({
				type: 'semantic',
				severity: 'info',
				message: 'Consider using <button> for button-styled elements',
				rule: 'semantic/use-button',
				suggestion: 'Elements with button styles should be <button> elements',
			})
		}

		return []
	},
}

/**
 * Rule: Use <a> for links, not other elements
 */
const linkRule: SemanticRule = {
	id: 'semantic/use-anchor',
	severity: 'warning',
	check: (html: string): ValidationIssue[] => {
		// Look for divs/spans with href-like behavior
		const fakeLinksRegex = /<(div|span)[^>]*(?:onclick="[^"]*location|class="[^"]*link)/gi
		if (fakeLinksRegex.test(html)) {
			return [{
				type: 'semantic',
				severity: 'warning',
				message: 'Use <a> elements for navigation links',
				rule: 'semantic/use-anchor',
				suggestion: 'Replace link-styled divs/spans with <a href="..."> elements',
			}]
		}

		return []
	},
}

/**
 * Rule: Lists should use appropriate elements
 */
const listRule: SemanticRule = {
	id: 'semantic/use-lists',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// Look for patterns that might be lists but aren't using ul/ol/li
		const listPatternRegex = /<div[^>]*class="[^"]*(?:list|items)[^"]*"[^>]*>[\s\S]*?<div[^>]*class="[^"]*item/gi
		if (listPatternRegex.test(html) && !/<[uo]l[\s>]/i.test(html)) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'Consider using <ul> or <ol> for list content',
				rule: 'semantic/use-lists',
				suggestion: 'Use <ul>/<ol> with <li> elements for list-like structures',
			}]
		}

		return []
	},
}

/**
 * Rule: Images should be in <figure> when they have captions
 */
const figureRule: SemanticRule = {
	id: 'semantic/use-figure',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// Look for images followed by caption-like text not in figure
		const imgCaptionRegex = /<img[^>]*>[\s\S]{0,50}<(?:p|span|div)[^>]*class="[^"]*caption/gi
		if (imgCaptionRegex.test(html) && !/<figure[\s>]/i.test(html)) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'Consider using <figure> and <figcaption> for images with captions',
				rule: 'semantic/use-figure',
				suggestion: 'Wrap image and caption in <figure> with <figcaption>',
			}]
		}

		return []
	},
}

/**
 * Rule: Avoid using <div> soup
 */
const divSoupRule: SemanticRule = {
	id: 'semantic/avoid-div-soup',
	severity: 'info',
	check: (html: string): ValidationIssue[] => {
		// Count total elements vs divs
		const allElements = html.match(/<[a-z]+[\s>]/gi)?.length ?? 0
		const divElements = html.match(/<div[\s>]/gi)?.length ?? 0

		// If more than 70% of elements are divs, suggest semantic elements
		if (allElements > 5 && divElements / allElements > 0.7) {
			return [{
				type: 'semantic',
				severity: 'info',
				message: 'High proportion of <div> elements detected',
				rule: 'semantic/avoid-div-soup',
				suggestion: 'Consider using semantic elements like <section>, <article>, <nav>, <aside>, etc.',
			}]
		}

		return []
	},
}

// =============================================================================
// Main Validation Function
// =============================================================================

const ALL_RULES: SemanticRule[] = [
	mainElementRule,
	headingHierarchyRule,
	navigationRule,
	footerRule,
	headerRule,
	sectionHeadingRule,
	articleRule,
	buttonRule,
	linkRule,
	listRule,
	figureRule,
	divSoupRule,
]

/**
 * Run all semantic HTML validation rules
 */
export function validateSemantics(html: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	for (const rule of ALL_RULES) {
		try {
			const ruleIssues = rule.check(html)
			issues.push(...ruleIssues)
		} catch (err) {
			console.error(`Semantic rule ${rule.id} failed:`, err)
		}
	}

	return issues
}

/**
 * Run specific semantic rules
 */
export function validateSemanticsWithRules(html: string, ruleIds: string[]): ValidationIssue[] {
	const issues: ValidationIssue[] = []
	const rulesToRun = ALL_RULES.filter(r => ruleIds.includes(r.id))

	for (const rule of rulesToRun) {
		try {
			const ruleIssues = rule.check(html)
			issues.push(...ruleIssues)
		} catch (err) {
			console.error(`Semantic rule ${rule.id} failed:`, err)
		}
	}

	return issues
}

/**
 * Get list of available semantic rules
 */
export function getAvailableRules(): Array<{ id: string; severity: string }> {
	return ALL_RULES.map(r => ({ id: r.id, severity: r.severity }))
}

export default {
	validateSemantics,
	validateSemanticsWithRules,
	getAvailableRules,
}

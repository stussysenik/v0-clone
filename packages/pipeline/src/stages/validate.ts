/**
 * Validation Pipeline Stage
 * Validates generated code for MDN compatibility, semantic HTML, and accessibility
 */

import {
	type ValidationIssue,
	type ValidationResult,
	devLog,
	now,
	runMDNCompatCheck,
	validateSemantics,
	validateA11y,
} from '@v0-clone/shared'
import type { GeneratedOutput } from './generate'
import type { Intent } from './parse'

// =============================================================================
// Validation Configuration
// =============================================================================

export interface ValidationConfig {
	/** Enable MDN compatibility checking */
	mdnCompat: boolean
	/** Enable semantic HTML validation */
	semantics: boolean
	/** Enable accessibility validation */
	a11y: boolean
	/** Enable intent-specific structure validation */
	structureCheck: boolean
	/** Enable broken image URL detection */
	imageUrlCheck: boolean
	/** Minimum score required to pass (0-100) */
	minScore: number
	/** Treat warnings as errors */
	strictMode: boolean
	/** Intent type for structure validation */
	intent?: Intent
}

const DEFAULT_CONFIG: ValidationConfig = {
	mdnCompat: true,
	semantics: true,
	a11y: true,
	structureCheck: true,
	imageUrlCheck: true,
	minScore: 70,
	strictMode: false,
}

// =============================================================================
// Validation Stage
// =============================================================================

export interface ValidationOutput extends GeneratedOutput {
	validation: ValidationResult
}

/**
 * Extract CSS from generated code
 */
function extractCSS(code: string): string {
	const styleMatches = code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
	const cssBlocks: string[] = []

	for (const match of styleMatches) {
		cssBlocks.push(match[1])
	}

	// Also extract inline styles
	const inlineMatches = code.matchAll(/style="([^"]*)"/gi)
	for (const match of inlineMatches) {
		cssBlocks.push(match[1].replace(/;/g, ';\n'))
	}

	return cssBlocks.join('\n')
}

/**
 * Validate structure based on intent
 */
function validateStructure(code: string, intent?: Intent): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	if (intent === 'page') {
		// Page should have navigation
		if (!/<nav[\s>]/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'warning',
				message: 'Page missing <nav> element for navigation',
				suggestion: 'Add a <nav> element for site navigation',
			})
		}

		// Page should have main content area
		if (!/<main[\s>]/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'warning',
				message: 'Page missing <main> element for main content',
				suggestion: 'Wrap main content in a <main> element',
			})
		}

		// Page should have footer
		if (!/<footer[\s>]/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'info',
				message: 'Page missing <footer> element',
				suggestion: 'Consider adding a <footer> for site information',
			})
		}

		// Page should have multiple sections
		const sectionCount = (code.match(/<section[\s>]/gi) || []).length
		if (sectionCount < 2) {
			issues.push({
				type: 'structure',
				severity: 'warning',
				message: `Page has only ${sectionCount} <section> element(s), expected multiple sections`,
				suggestion: 'Add more <section> elements to organize content',
			})
		}
	}

	if (intent === 'app') {
		// App should have script with state
		if (!/<script[\s>]/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'error',
				message: 'App missing <script> block for state management',
				suggestion: 'Add a <script> block with $state() for app state',
			})
		} else if (!/\$state\s*\(/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'warning',
				message: 'App missing $state() for reactive state management',
				suggestion: 'Use $state() for interactive app state',
			})
		}
	}

	if (intent === 'section') {
		// Section should have proper wrapper
		if (!/<section[\s>]/i.test(code)) {
			issues.push({
				type: 'structure',
				severity: 'info',
				message: 'Section component should use <section> wrapper',
				suggestion: 'Wrap section content in a <section> element',
			})
		}
	}

	return issues
}

/**
 * Check for broken/placeholder image URLs
 */
function validateImageUrls(code: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	// Find all image src attributes
	const imgSrcMatches = code.matchAll(/(?:src|background-image)[=:]\s*["']?([^"'\s>)]+)/gi)

	const brokenDomains = [
		'placeholder.com',
		'via.placeholder.com',
		'placehold.it',
		'placekitten.com',
		'lorempixel.com',
		'dummyimage.com',
	]

	for (const match of imgSrcMatches) {
		const url = match[1]
		if (!url) continue

		// Skip data URLs and relative paths
		if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('#')) {
			continue
		}

		// Check for known broken placeholder services
		for (const domain of brokenDomains) {
			if (url.includes(domain)) {
				issues.push({
					type: 'image',
					severity: 'warning',
					message: `Image uses broken placeholder service: ${domain}`,
					suggestion: 'Use real Unsplash URLs instead: https://images.unsplash.com/photo-xxx',
				})
				break
			}
		}
	}

	return issues
}

/**
 * Validate script and style blocks
 */
function validateCodeBlocks(code: string): ValidationIssue[] {
	const issues: ValidationIssue[] = []

	// Check for unclosed script tags
	const scriptOpenCount = (code.match(/<script[^>]*>/gi) || []).length
	const scriptCloseCount = (code.match(/<\/script>/gi) || []).length
	if (scriptOpenCount !== scriptCloseCount) {
		issues.push({
			type: 'syntax',
			severity: 'error',
			message: `Mismatched script tags: ${scriptOpenCount} opening, ${scriptCloseCount} closing`,
			suggestion: 'Ensure all <script> tags are properly closed',
		})
	}

	// Check for unclosed style tags
	const styleOpenCount = (code.match(/<style[^>]*>/gi) || []).length
	const styleCloseCount = (code.match(/<\/style>/gi) || []).length
	if (styleOpenCount !== styleCloseCount) {
		issues.push({
			type: 'syntax',
			severity: 'error',
			message: `Mismatched style tags: ${styleOpenCount} opening, ${styleCloseCount} closing`,
			suggestion: 'Ensure all <style> tags are properly closed',
		})
	}

	return issues
}

/**
 * Calculate validation score based on issues
 */
function calculateScore(issues: ValidationIssue[]): number {
	let score = 100

	for (const issue of issues) {
		switch (issue.severity) {
			case 'error':
				score -= 15
				break
			case 'warning':
				score -= 5
				break
			case 'info':
				score -= 1
				break
		}
	}

	return Math.max(0, Math.min(100, score))
}

/**
 * Count issues by severity
 */
function countIssues(issues: ValidationIssue[]): { errors: number; warnings: number; infos: number } {
	return {
		errors: issues.filter(i => i.severity === 'error').length,
		warnings: issues.filter(i => i.severity === 'warning').length,
		infos: issues.filter(i => i.severity === 'info').length,
	}
}

/**
 * Validate generated code
 */
export async function validate(
	input: GeneratedOutput,
	config: Partial<ValidationConfig> = {},
): Promise<ValidationOutput> {
	const startTime = now()
	const fullConfig = { ...DEFAULT_CONFIG, ...config }

	devLog('pipeline', 'Validation stage started', { config: fullConfig })

	const issues: ValidationIssue[] = []
	const html = input.code
	const css = extractCSS(input.code)

	// Run MDN compatibility checks
	if (fullConfig.mdnCompat) {
		devLog('pipeline', 'Running MDN compatibility check')
		const mdnIssues = runMDNCompatCheck({ html, css })
		issues.push(...mdnIssues)
		devLog('pipeline', `MDN check found ${mdnIssues.length} issues`)
	}

	// Run semantic HTML validation
	if (fullConfig.semantics) {
		devLog('pipeline', 'Running semantic HTML validation')
		const semanticIssues = validateSemantics(html)
		issues.push(...semanticIssues)
		devLog('pipeline', `Semantic check found ${semanticIssues.length} issues`)
	}

	// Run accessibility validation
	if (fullConfig.a11y) {
		devLog('pipeline', 'Running accessibility validation')
		const a11yIssues = validateA11y(html, css)
		issues.push(...a11yIssues)
		devLog('pipeline', `A11y check found ${a11yIssues.length} issues`)
	}

	// Run structure validation based on intent
	if (fullConfig.structureCheck && fullConfig.intent) {
		devLog('pipeline', `Running structure validation for intent: ${fullConfig.intent}`)
		const structureIssues = validateStructure(html, fullConfig.intent)
		issues.push(...structureIssues)
		devLog('pipeline', `Structure check found ${structureIssues.length} issues`)
	}

	// Run image URL validation
	if (fullConfig.imageUrlCheck) {
		devLog('pipeline', 'Running image URL validation')
		const imageIssues = validateImageUrls(html)
		issues.push(...imageIssues)
		devLog('pipeline', `Image URL check found ${imageIssues.length} issues`)
	}

	// Run code block validation
	devLog('pipeline', 'Running code block validation')
	const codeBlockIssues = validateCodeBlocks(html)
	issues.push(...codeBlockIssues)
	devLog('pipeline', `Code block check found ${codeBlockIssues.length} issues`)

	// Calculate score and summary
	const score = calculateScore(issues)
	const summary = countIssues(issues)
	const valid = fullConfig.strictMode
		? summary.errors === 0 && summary.warnings === 0
		: summary.errors === 0

	const validation: ValidationResult = {
		valid: valid && score >= fullConfig.minScore,
		score,
		issues,
		summary,
	}

	const durationMs = now() - startTime

	devLog('pipeline', 'Validation stage completed', {
		durationMs,
		score,
		valid: validation.valid,
		issueCount: issues.length,
		summary,
	})

	return {
		...input,
		validation,
	}
}

/**
 * Create a validation report string
 */
export function createValidationReport(result: ValidationResult): string {
	const lines: string[] = []

	lines.push('═══════════════════════════════════════════════════════════════')
	lines.push(`  VALIDATION REPORT                              Score: ${result.score}/100`)
	lines.push('═══════════════════════════════════════════════════════════════')
	lines.push('')

	if (result.valid) {
		lines.push('  ✓ PASSED')
	} else {
		lines.push('  ✗ FAILED')
	}

	lines.push('')
	lines.push(`  Errors:   ${result.summary.errors}`)
	lines.push(`  Warnings: ${result.summary.warnings}`)
	lines.push(`  Info:     ${result.summary.infos}`)
	lines.push('')

	if (result.issues.length > 0) {
		lines.push('───────────────────────────────────────────────────────────────')
		lines.push('  ISSUES')
		lines.push('───────────────────────────────────────────────────────────────')
		lines.push('')

		// Group by type
		const byType = new Map<string, ValidationIssue[]>()
		for (const issue of result.issues) {
			const existing = byType.get(issue.type) ?? []
			existing.push(issue)
			byType.set(issue.type, existing)
		}

		for (const [type, typeIssues] of byType) {
			lines.push(`  [${type.toUpperCase()}]`)

			for (const issue of typeIssues) {
				const icon = issue.severity === 'error' ? '✗' : issue.severity === 'warning' ? '!' : 'i'
				const location = issue.line ? ` (line ${issue.line})` : ''
				lines.push(`    ${icon} ${issue.message}${location}`)
				if (issue.suggestion) {
					lines.push(`      → ${issue.suggestion}`)
				}
			}

			lines.push('')
		}
	}

	lines.push('═══════════════════════════════════════════════════════════════')

	return lines.join('\n')
}

/**
 * Quick validation check (returns boolean)
 */
export async function isValid(
	input: GeneratedOutput,
	config: Partial<ValidationConfig> = {},
): Promise<boolean> {
	const result = await validate(input, config)
	return result.validation.valid
}

export default {
	validate,
	createValidationReport,
	isValid,
}

/**
 * Performance Audit Pipeline Stage
 * Pre-emptive performance analysis and Core Web Vitals estimation
 */

import {
	type CoreWebVitals,
	type PerformanceAuditResult,
	type PerformanceRecommendation,
	type PerformanceThresholds,
	devLog,
	now,
} from '@v0-clone/shared'
import type { GeneratedOutput } from './generate'

// =============================================================================
// Default Thresholds (Lighthouse 98+ target)
// =============================================================================

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
	lighthouseScore: 98,
	lcp: 1200,     // 1.2 seconds
	cls: 0.1,      // Cumulative Layout Shift
	inp: 200,      // Interaction to Next Paint
	maxBundleKb: 50,
}

// =============================================================================
// Performance Analysis Functions
// =============================================================================

/**
 * Calculate estimated bundle sizes
 */
function calculateBundleSize(code: string): {
	html: number
	css: number
	js: number
	total: number
} {
	// Extract CSS
	const cssMatches = code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
	let cssContent = ''
	for (const match of cssMatches) {
		cssContent += match[1]
	}

	// Extract JS
	const jsMatches = code.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
	let jsContent = ''
	for (const match of jsMatches) {
		// Skip external scripts
		const tag = match[0]
		if (!tag.includes('src=')) {
			jsContent += match[1]
		}
	}

	// Calculate sizes in bytes
	const htmlSize = new Blob([code]).size
	const cssSize = new Blob([cssContent]).size
	const jsSize = new Blob([jsContent]).size

	return {
		html: htmlSize,
		css: cssSize,
		js: jsSize,
		total: htmlSize, // HTML includes inline CSS/JS
	}
}

/**
 * Analyze for LCP (Largest Contentful Paint) issues
 */
function analyzeLCP(code: string): PerformanceRecommendation[] {
	const recommendations: PerformanceRecommendation[] = []

	// Check for large images without lazy loading
	const imgRegex = /<img[^>]*>/gi
	const images: string[] = code.match(imgRegex) ?? []

	for (let i = 0; i < images.length; i++) {
		const img = images[i]
		// Check for missing loading attribute on non-critical images
		if (!img.includes('loading=') && !img.includes('fetchpriority="high"')) {
			// Only flag if it's likely not above-the-fold (heuristic)
			if (i > 0) {
				recommendations.push({
					category: 'lcp',
					severity: 'info',
					message: 'Image may benefit from lazy loading',
					impact: 'medium',
					suggestion: 'Add loading="lazy" to below-the-fold images',
				})
				break // Only report once
			}
		}

		// Check for missing width/height attributes
		if (!img.includes('width=') || !img.includes('height=')) {
			recommendations.push({
				category: 'cls',
				severity: 'warning',
				message: 'Image missing explicit dimensions',
				impact: 'high',
				suggestion: 'Add width and height attributes to prevent layout shifts',
			})
			break // Only report once
		}
	}

	// Check for render-blocking resources
	const externalCSS = code.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? []
	if (externalCSS.length > 2) {
		recommendations.push({
			category: 'lcp',
			severity: 'warning',
			message: `${externalCSS.length} external stylesheets may block rendering`,
			impact: 'high',
			suggestion: 'Consider inlining critical CSS or using preload',
		})
	}

	// Check for large inline styles
	const styleMatches = code.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
	let totalStyleSize = 0
	for (const match of styleMatches) {
		totalStyleSize += match[1].length
	}
	if (totalStyleSize > 50000) {
		recommendations.push({
			category: 'lcp',
			severity: 'warning',
			message: 'Large inline styles may delay rendering',
			impact: 'medium',
			suggestion: 'Consider code-splitting CSS or removing unused styles',
		})
	}

	return recommendations
}

/**
 * Analyze for CLS (Cumulative Layout Shift) issues
 */
function analyzeCLS(code: string): PerformanceRecommendation[] {
	const recommendations: PerformanceRecommendation[] = []

	// Check for images without dimensions
	const imgWithoutDimensions = code.match(/<img(?![^>]*(?:width|height))[^>]*>/gi) ?? []
	if (imgWithoutDimensions.length > 0) {
		recommendations.push({
			category: 'cls',
			severity: 'warning',
			message: `${imgWithoutDimensions.length} image(s) without explicit dimensions`,
			impact: 'high',
			suggestion: 'Add width and height attributes or use aspect-ratio CSS',
		})
	}

	// Check for dynamic content containers without reserved space
	if (code.includes('async') || code.includes('await') || code.includes('fetch(')) {
		if (!code.includes('min-height') && !code.includes('skeleton')) {
			recommendations.push({
				category: 'cls',
				severity: 'info',
				message: 'Dynamic content may cause layout shifts',
				impact: 'medium',
				suggestion: 'Use skeleton loaders or reserve space with min-height',
			})
		}
	}

	// Check for web fonts that might cause FOUT
	const fontFaceCount = (code.match(/@font-face/gi) ?? []).length
	const googleFonts = (code.match(/fonts\.googleapis\.com/gi) ?? []).length
	if (fontFaceCount > 0 || googleFonts > 0) {
		if (!code.includes('font-display')) {
			recommendations.push({
				category: 'cls',
				severity: 'info',
				message: 'Web fonts may cause flash of unstyled text',
				impact: 'medium',
				suggestion: 'Add font-display: swap to @font-face rules',
			})
		}
	}

	return recommendations
}

/**
 * Analyze for general performance issues
 */
function analyzeGeneral(code: string): PerformanceRecommendation[] {
	const recommendations: PerformanceRecommendation[] = []

	// Check for large inline scripts
	const scriptMatches = code.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
	for (const match of scriptMatches) {
		if (match[1].length > 10000 && !match[0].includes('async') && !match[0].includes('defer')) {
			recommendations.push({
				category: 'lcp',
				severity: 'warning',
				message: 'Large synchronous script may block rendering',
				impact: 'high',
				suggestion: 'Add async or defer attribute, or move to external file',
			})
			break
		}
	}

	// Check for too many DOM elements (heuristic)
	const elementCount = (code.match(/<[a-z][^>]*>/gi) ?? []).length
	if (elementCount > 1500) {
		recommendations.push({
			category: 'lcp',
			severity: 'info',
			message: `High DOM element count (${elementCount})`,
			impact: 'low',
			suggestion: 'Consider virtualization for long lists or simplifying the DOM',
		})
	}

	// Check for animations that might cause jank
	const animationCount = (code.match(/animation:|@keyframes|transition:/gi) ?? []).length
	if (animationCount > 20) {
		recommendations.push({
			category: 'inp',
			severity: 'info',
			message: 'Many CSS animations detected',
			impact: 'low',
			suggestion: 'Ensure animations use transform/opacity for GPU acceleration',
		})
	}

	// Check for third-party resources
	const thirdPartyRegex = /(?:src|href)=["']https?:\/\/(?!localhost|127\.0\.0\.1)[^"']+/gi
	const thirdPartyCount = (code.match(thirdPartyRegex) ?? []).length
	if (thirdPartyCount > 5) {
		recommendations.push({
			category: 'lcp',
			severity: 'info',
			message: `${thirdPartyCount} third-party resources detected`,
			impact: 'medium',
			suggestion: 'Consider self-hosting critical resources or using resource hints',
		})
	}

	return recommendations
}

/**
 * Estimate a Lighthouse-like performance score
 */
function estimateScore(
	recommendations: PerformanceRecommendation[],
	bundleSize: { total: number },
	thresholds: PerformanceThresholds,
): number {
	let score = 100

	// Deduct for recommendations
	for (const rec of recommendations) {
		switch (rec.severity) {
			case 'error':
				score -= rec.impact === 'high' ? 15 : rec.impact === 'medium' ? 10 : 5
				break
			case 'warning':
				score -= rec.impact === 'high' ? 8 : rec.impact === 'medium' ? 5 : 2
				break
			case 'info':
				score -= rec.impact === 'high' ? 3 : rec.impact === 'medium' ? 2 : 1
				break
		}
	}

	// Deduct for bundle size exceeding threshold
	const bundleKb = bundleSize.total / 1024
	if (bundleKb > thresholds.maxBundleKb) {
		const excess = bundleKb - thresholds.maxBundleKb
		score -= Math.min(20, Math.floor(excess / 10) * 2)
	}

	return Math.max(0, Math.min(100, score))
}

// =============================================================================
// Performance Audit Stage
// =============================================================================

export interface PerformanceAuditOutput extends GeneratedOutput {
	performance: PerformanceAuditResult
}

/**
 * Run performance audit on generated code
 */
export async function auditPerformance(
	input: GeneratedOutput,
	thresholds: Partial<PerformanceThresholds> = {},
): Promise<PerformanceAuditOutput> {
	const startTime = now()
	const fullThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }

	devLog('pipeline', 'Performance audit started')

	const code = input.code

	// Calculate bundle sizes
	const bundleSize = calculateBundleSize(code)

	// Collect all recommendations
	const recommendations: PerformanceRecommendation[] = [
		...analyzeLCP(code),
		...analyzeCLS(code),
		...analyzeGeneral(code),
	]

	// Bundle size warning
	const bundleKb = bundleSize.total / 1024
	if (bundleKb > fullThresholds.maxBundleKb) {
		recommendations.push({
			category: 'bundle',
			severity: 'warning',
			message: `Bundle size (${bundleKb.toFixed(1)}KB) exceeds threshold (${fullThresholds.maxBundleKb}KB)`,
			impact: 'medium',
			suggestion: 'Remove unused code, optimize images, or split into chunks',
		})
	}

	// Estimate score
	const score = estimateScore(recommendations, bundleSize, fullThresholds)

	// Note: Actual CWV metrics require browser execution
	// These are placeholder estimates based on static analysis
	const cwv: CoreWebVitals = {
		lcp: null,  // Requires runtime measurement
		fid: null,  // Deprecated
		inp: null,  // Requires runtime measurement
		cls: null,  // Requires runtime measurement
		fcp: null,  // Requires runtime measurement
		ttfb: null, // Requires runtime measurement
	}

	const performance: PerformanceAuditResult = {
		score,
		cwv,
		bundleSize,
		recommendations,
		passesThreshold: score >= fullThresholds.lighthouseScore,
	}

	const durationMs = now() - startTime

	devLog('pipeline', 'Performance audit completed', {
		durationMs,
		score,
		passesThreshold: performance.passesThreshold,
		recommendationCount: recommendations.length,
	})

	return {
		...input,
		performance,
	}
}

/**
 * Create a performance report string
 */
export function createPerformanceReport(result: PerformanceAuditResult): string {
	const lines: string[] = []

	lines.push('═══════════════════════════════════════════════════════════════')
	lines.push(`  PERFORMANCE AUDIT                              Score: ${result.score}/100`)
	lines.push('═══════════════════════════════════════════════════════════════')
	lines.push('')

	if (result.passesThreshold) {
		lines.push('  ✓ PASSES THRESHOLD (≥98)')
	} else {
		lines.push('  ✗ BELOW THRESHOLD (<98)')
	}

	lines.push('')
	lines.push('  Bundle Size:')
	lines.push(`    HTML: ${(result.bundleSize.html / 1024).toFixed(1)}KB`)
	lines.push(`    CSS:  ${(result.bundleSize.css / 1024).toFixed(1)}KB`)
	lines.push(`    JS:   ${(result.bundleSize.js / 1024).toFixed(1)}KB`)
	lines.push('')

	if (result.recommendations.length > 0) {
		lines.push('───────────────────────────────────────────────────────────────')
		lines.push('  RECOMMENDATIONS')
		lines.push('───────────────────────────────────────────────────────────────')
		lines.push('')

		// Group by category
		const byCategory = new Map<string, PerformanceRecommendation[]>()
		for (const rec of result.recommendations) {
			const existing = byCategory.get(rec.category) ?? []
			existing.push(rec)
			byCategory.set(rec.category, existing)
		}

		for (const [category, recs] of byCategory) {
			lines.push(`  [${category.toUpperCase()}]`)
			for (const rec of recs) {
				const icon = rec.severity === 'warning' ? '!' : 'i'
				const impact = `[${rec.impact}]`
				lines.push(`    ${icon} ${impact} ${rec.message}`)
				lines.push(`      → ${rec.suggestion}`)
			}
			lines.push('')
		}
	} else {
		lines.push('')
		lines.push('  No issues found!')
		lines.push('')
	}

	lines.push('═══════════════════════════════════════════════════════════════')

	return lines.join('\n')
}

export default {
	auditPerformance,
	createPerformanceReport,
	DEFAULT_THRESHOLDS,
}

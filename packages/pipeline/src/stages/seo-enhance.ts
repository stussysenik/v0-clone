/**
 * SEO Enhancement Pipeline Stage
 * Adds structured data, meta tags, and agent-readable content
 */

import {
	type SEOMetadata,
	type SEOEnhancementResult,
	devLog,
	now,
	schema,
} from '@v0-clone/shared'
import type { GeneratedOutput } from './generate'

// Re-export schema utilities for convenience
const {
	createWebPage,
	createArticle,
	createProduct,
	createFAQ,
	createHowTo,
	generateJsonLdScript,
	inferPageType,
	extractTitle,
	extractDescription,
} = schema
type Thing = schema.Thing

// =============================================================================
// Types
// =============================================================================

export interface SEOConfig {
	/** Enable JSON-LD injection */
	enableJsonLd: boolean
	/** Enable meta tag injection */
	enableMetaTags: boolean
	/** Enable Open Graph tags */
	enableOpenGraph: boolean
	/** Enable Twitter Card tags */
	enableTwitterCard: boolean
	/** Default site name */
	siteName?: string
	/** Default author */
	defaultAuthor?: string
	/** Default Twitter handle */
	twitterHandle?: string
	/** Base URL for canonical links */
	baseUrl?: string
}

export interface SEOOutput extends GeneratedOutput {
	seo: SEOEnhancementResult
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: SEOConfig = {
	enableJsonLd: true,
	enableMetaTags: true,
	enableOpenGraph: true,
	enableTwitterCard: true,
}

// =============================================================================
// Meta Tag Templates
// =============================================================================

interface MetaTagSet {
	standard: string[]
	openGraph: string[]
	twitter: string[]
}

function generateMetaTags(
	metadata: SEOMetadata,
	config: SEOConfig,
): MetaTagSet {
	const tags: MetaTagSet = {
		standard: [],
		openGraph: [],
		twitter: [],
	}

	// Standard meta tags
	if (config.enableMetaTags) {
		if (metadata.description) {
			tags.standard.push(
				`<meta name="description" content="${escapeHtml(metadata.description)}">`
			)
		}

		if (metadata.keywords && metadata.keywords.length > 0) {
			tags.standard.push(
				`<meta name="keywords" content="${escapeHtml(metadata.keywords.join(', '))}">`
			)
		}

		if (metadata.author) {
			tags.standard.push(
				`<meta name="author" content="${escapeHtml(metadata.author)}">`
			)
		}

		if (metadata.canonical) {
			tags.standard.push(
				`<link rel="canonical" href="${escapeHtml(metadata.canonical)}">`
			)
		}

		if (metadata.robots) {
			tags.standard.push(
				`<meta name="robots" content="${escapeHtml(metadata.robots)}">`
			)
		}

		// Viewport (ensure it exists)
		tags.standard.push(
			`<meta name="viewport" content="width=device-width, initial-scale=1.0">`
		)
	}

	// Open Graph tags
	if (config.enableOpenGraph && metadata.openGraph) {
		const og = metadata.openGraph

		if (og.title) {
			tags.openGraph.push(
				`<meta property="og:title" content="${escapeHtml(og.title)}">`
			)
		}

		if (og.description) {
			tags.openGraph.push(
				`<meta property="og:description" content="${escapeHtml(og.description)}">`
			)
		}

		if (og.image) {
			tags.openGraph.push(
				`<meta property="og:image" content="${escapeHtml(og.image)}">`
			)
		}

		if (og.url) {
			tags.openGraph.push(
				`<meta property="og:url" content="${escapeHtml(og.url)}">`
			)
		}

		if (og.type) {
			tags.openGraph.push(
				`<meta property="og:type" content="${escapeHtml(og.type)}">`
			)
		}

		if (og.siteName) {
			tags.openGraph.push(
				`<meta property="og:site_name" content="${escapeHtml(og.siteName)}">`
			)
		}

		if (og.locale) {
			tags.openGraph.push(
				`<meta property="og:locale" content="${escapeHtml(og.locale)}">`
			)
		}
	}

	// Twitter Card tags
	if (config.enableTwitterCard && metadata.twitter) {
		const tw = metadata.twitter

		tags.twitter.push(
			`<meta name="twitter:card" content="${escapeHtml(tw.card ?? 'summary')}">`
		)

		if (tw.site) {
			tags.twitter.push(
				`<meta name="twitter:site" content="${escapeHtml(tw.site)}">`
			)
		}

		if (tw.creator) {
			tags.twitter.push(
				`<meta name="twitter:creator" content="${escapeHtml(tw.creator)}">`
			)
		}

		if (tw.title) {
			tags.twitter.push(
				`<meta name="twitter:title" content="${escapeHtml(tw.title)}">`
			)
		}

		if (tw.description) {
			tags.twitter.push(
				`<meta name="twitter:description" content="${escapeHtml(tw.description)}">`
			)
		}

		if (tw.image) {
			tags.twitter.push(
				`<meta name="twitter:image" content="${escapeHtml(tw.image)}">`
			)
		}
	}

	return tags
}

// =============================================================================
// Content Analysis
// =============================================================================

/**
 * Extract FAQ content from HTML
 */
function extractFAQContent(html: string): Array<{ question: string; answer: string }> {
	const faqs: Array<{ question: string; answer: string }> = []

	// Look for <details><summary> pattern
	const detailsRegex = /<details[^>]*>\s*<summary[^>]*>([^<]+)<\/summary>\s*([\s\S]*?)<\/details>/gi
	let match: RegExpExecArray | null

	while ((match = detailsRegex.exec(html)) !== null) {
		const question = match[1].trim()
		const answer = stripHtml(match[2]).trim()
		if (question && answer) {
			faqs.push({ question, answer })
		}
	}

	// Look for Q&A pattern (dt/dd)
	const dlRegex = /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
	while ((match = dlRegex.exec(html)) !== null) {
		const question = match[1].trim()
		const answer = stripHtml(match[2]).trim()
		if (question && answer) {
			faqs.push({ question, answer })
		}
	}

	return faqs
}

/**
 * Extract HowTo steps from HTML
 */
function extractHowToSteps(html: string): Array<{ text: string; image?: string }> {
	const steps: Array<{ text: string; image?: string }> = []

	// Look for ordered list items
	const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi
	const olMatch = olRegex.exec(html)

	if (olMatch) {
		const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
		let match: RegExpExecArray | null

		while ((match = liRegex.exec(olMatch[1])) !== null) {
			const text = stripHtml(match[1]).trim()
			const imgMatch = match[1].match(/<img[^>]*src=["']([^"']+)["']/i)

			if (text) {
				steps.push({
					text,
					image: imgMatch?.[1],
				})
			}
		}
	}

	// Look for numbered steps in headings
	const stepRegex = /step\s*(\d+)[:\s]*([^<]+)/gi
	let match: RegExpExecArray | null

	while ((match = stepRegex.exec(html)) !== null) {
		const text = match[2].trim()
		if (text && !steps.some((s) => s.text === text)) {
			steps.push({ text })
		}
	}

	return steps
}

/**
 * Extract product info from HTML
 */
function extractProductInfo(html: string): {
	name?: string
	price?: number
	currency?: string
	description?: string
} {
	const info: {
		name?: string
		price?: number
		currency?: string
		description?: string
	} = {}

	// Extract product name from h1 or product-title class
	const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
		html.match(/class=["'][^"']*product-title[^"']*["'][^>]*>([^<]+)/i)
	if (nameMatch) {
		info.name = nameMatch[1].trim()
	}

	// Extract price
	const priceMatch = html.match(/\$(\d+(?:\.\d{2})?)/i) ||
		html.match(/price[^>]*>.*?(\d+(?:\.\d{2})?)/i)
	if (priceMatch) {
		info.price = parseFloat(priceMatch[1])
		info.currency = 'USD'
	}

	return info
}

// =============================================================================
// JSON-LD Generation
// =============================================================================

function generateJsonLdForPage(
	html: string,
	metadata: SEOMetadata,
	config: SEOConfig,
): Thing | null {
	const pageType = inferPageType(html)

	switch (pageType) {
		case 'article':
			return createArticle({
				headline: metadata.title ?? extractTitle(html) ?? 'Untitled',
				description: metadata.description ?? extractDescription(html) ?? undefined,
				author: metadata.author ? { name: metadata.author } : undefined,
				publisher: config.siteName
					? { name: config.siteName }
					: undefined,
				datePublished: new Date().toISOString(),
				keywords: metadata.keywords,
			})

		case 'product': {
			const productInfo = extractProductInfo(html)
			return createProduct({
				name: productInfo.name ?? metadata.title ?? 'Product',
				description: metadata.description ?? extractDescription(html) ?? undefined,
				price: productInfo.price,
				currency: productInfo.currency,
			})
		}

		case 'faq': {
			const faqs = extractFAQContent(html)
			if (faqs.length > 0) {
				return createFAQ(faqs)
			}
			break
		}

		case 'howto': {
			const steps = extractHowToSteps(html)
			if (steps.length > 0) {
				return createHowTo({
					name: metadata.title ?? extractTitle(html) ?? 'How To',
					description: metadata.description ?? extractDescription(html) ?? undefined,
					steps,
				})
			}
			break
		}
	}

	// Default to WebPage
	return createWebPage({
		name: metadata.title ?? extractTitle(html) ?? 'Page',
		description: metadata.description ?? extractDescription(html) ?? undefined,
		url: metadata.canonical,
	})
}

// =============================================================================
// HTML Injection
// =============================================================================

/**
 * Inject SEO enhancements into HTML
 */
function injectSEOIntoHtml(
	html: string,
	metaTags: MetaTagSet,
	jsonLdScript: string | null,
): string {
	// Find </head> to inject before it
	const headEndIndex = html.indexOf('</head>')

	if (headEndIndex === -1) {
		// No head tag, return as-is
		return html
	}

	// Combine all tags
	const allTags = [
		...metaTags.standard,
		...metaTags.openGraph,
		...metaTags.twitter,
	]

	// Build injection content
	let injection = '\n  <!-- SEO Enhancement -->\n'
	injection += allTags.map((tag) => `  ${tag}`).join('\n')

	if (jsonLdScript) {
		injection += `\n  ${jsonLdScript.split('\n').join('\n  ')}`
	}

	injection += '\n  <!-- /SEO Enhancement -->\n'

	// Inject before </head>
	return (
		html.slice(0, headEndIndex) +
		injection +
		html.slice(headEndIndex)
	)
}

// =============================================================================
// Utility Functions
// =============================================================================

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// =============================================================================
// SEO Enhancement Stage
// =============================================================================

/**
 * Enhance output with SEO metadata and structured data
 */
export async function enhanceSEO(
	input: GeneratedOutput,
	config: Partial<SEOConfig> = {},
): Promise<SEOOutput> {
	const startTime = now()
	const fullConfig = { ...DEFAULT_CONFIG, ...config }

	devLog('pipeline', 'SEO enhancement started')

	const html = input.code

	// Extract basic metadata from content
	const extractedTitle = extractTitle(html)
	const extractedDescription = extractDescription(html)

	// Build metadata object
	const metadata: SEOMetadata = {
		title: extractedTitle ?? undefined,
		description: extractedDescription ?? undefined,
		author: fullConfig.defaultAuthor,
		canonical: fullConfig.baseUrl,
	}

	// Add Open Graph metadata
	if (fullConfig.enableOpenGraph) {
		metadata.openGraph = {
			title: metadata.title,
			description: metadata.description,
			type: 'website',
			siteName: fullConfig.siteName,
			locale: 'en_US',
		}
	}

	// Add Twitter Card metadata
	if (fullConfig.enableTwitterCard) {
		metadata.twitter = {
			card: 'summary_large_image',
			site: fullConfig.twitterHandle,
			title: metadata.title,
			description: metadata.description,
		}
	}

	// Generate meta tags
	const metaTags = generateMetaTags(metadata, fullConfig)

	// Generate JSON-LD
	let jsonLdScript: string | null = null
	let schemaTypes: string[] = []

	if (fullConfig.enableJsonLd) {
		const jsonLdData = generateJsonLdForPage(html, metadata, fullConfig)
		if (jsonLdData) {
			jsonLdScript = generateJsonLdScript(jsonLdData)
			schemaTypes = [jsonLdData['@type']]
		}
	}

	// Inject SEO content into HTML
	const enhancedHtml = injectSEOIntoHtml(html, metaTags, jsonLdScript)

	// Build result
	const seoResult: SEOEnhancementResult = {
		metadata,
		injectedTags: [
			...metaTags.standard,
			...metaTags.openGraph,
			...metaTags.twitter,
		].length,
		jsonLdTypes: schemaTypes,
		warnings: [],
	}

	// Add warnings for missing critical metadata
	if (!metadata.title) {
		seoResult.warnings.push('Missing page title - add <title> or <h1> tag')
	}

	if (!metadata.description) {
		seoResult.warnings.push('Missing meta description - add <meta name="description">')
	}

	const durationMs = now() - startTime

	devLog('pipeline', 'SEO enhancement completed', {
		durationMs,
		injectedTags: seoResult.injectedTags,
		jsonLdTypes: seoResult.jsonLdTypes,
		warnings: seoResult.warnings.length,
	})

	return {
		...input,
		code: enhancedHtml,
		seo: seoResult,
	}
}

/**
 * Generate llms.txt content for AI agent discovery
 */
export function generateLlmsTxt(options: {
	siteName: string
	description: string
	capabilities?: string[]
	contact?: string
	apiEndpoint?: string
}): string {
	const lines: string[] = [
		'# LLMs.txt',
		`# ${options.siteName}`,
		'',
		'## Description',
		options.description,
		'',
	]

	if (options.capabilities && options.capabilities.length > 0) {
		lines.push('## Capabilities')
		for (const cap of options.capabilities) {
			lines.push(`- ${cap}`)
		}
		lines.push('')
	}

	if (options.contact) {
		lines.push('## Contact')
		lines.push(options.contact)
		lines.push('')
	}

	if (options.apiEndpoint) {
		lines.push('## API')
		lines.push(options.apiEndpoint)
		lines.push('')
	}

	lines.push('## Generated')
	lines.push(new Date().toISOString())

	return lines.join('\n')
}

export default {
	enhanceSEO,
	generateLlmsTxt,
	DEFAULT_CONFIG,
}

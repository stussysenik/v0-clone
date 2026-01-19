/**
 * JSON-LD Schema Utilities
 * Structured data generation for SEO and agent-readable content
 */

// =============================================================================
// Schema.org Types
// =============================================================================

export interface Thing {
	'@type': string
	'@id'?: string
	name?: string
	description?: string
	url?: string
	image?: string | ImageObject
}

export interface ImageObject extends Thing {
	'@type': 'ImageObject'
	contentUrl?: string
	width?: number
	height?: number
	caption?: string
}

export interface WebPage extends Thing {
	'@type': 'WebPage'
	mainEntity?: Thing
	breadcrumb?: BreadcrumbList
	speakable?: SpeakableSpecification
	lastReviewed?: string
	datePublished?: string
	dateModified?: string
}

export interface WebSite extends Thing {
	'@type': 'WebSite'
	potentialAction?: SearchAction
	publisher?: Organization
}

export interface Organization extends Thing {
	'@type': 'Organization'
	logo?: string | ImageObject
	contactPoint?: ContactPoint[]
	sameAs?: string[]
	address?: PostalAddress
}

export interface ContactPoint extends Thing {
	'@type': 'ContactPoint'
	telephone?: string
	email?: string
	contactType?: string
	availableLanguage?: string[]
}

export interface PostalAddress extends Thing {
	'@type': 'PostalAddress'
	streetAddress?: string
	addressLocality?: string
	addressRegion?: string
	postalCode?: string
	addressCountry?: string
}

export interface Person extends Thing {
	'@type': 'Person'
	givenName?: string
	familyName?: string
	email?: string
	jobTitle?: string
	worksFor?: Organization
	sameAs?: string[]
}

export interface Article extends Thing {
	'@type': 'Article' | 'NewsArticle' | 'BlogPosting' | 'TechArticle'
	headline?: string
	author?: Person | Organization
	publisher?: Organization
	datePublished?: string
	dateModified?: string
	articleBody?: string
	wordCount?: number
	keywords?: string[]
	articleSection?: string
}

export interface Product extends Thing {
	'@type': 'Product'
	sku?: string
	brand?: Brand
	offers?: Offer | Offer[]
	aggregateRating?: AggregateRating
	review?: Review[]
	category?: string
}

export interface Brand extends Thing {
	'@type': 'Brand'
}

export interface Offer extends Thing {
	'@type': 'Offer'
	price?: number | string
	priceCurrency?: string
	availability?: string
	priceValidUntil?: string
	itemCondition?: string
	seller?: Organization
}

export interface AggregateRating extends Thing {
	'@type': 'AggregateRating'
	ratingValue: number
	reviewCount?: number
	ratingCount?: number
	bestRating?: number
	worstRating?: number
}

export interface Review extends Thing {
	'@type': 'Review'
	author?: Person
	reviewRating?: Rating
	reviewBody?: string
	datePublished?: string
}

export interface Rating extends Thing {
	'@type': 'Rating'
	ratingValue: number
	bestRating?: number
	worstRating?: number
}

export interface BreadcrumbList extends Thing {
	'@type': 'BreadcrumbList'
	itemListElement: ListItem[]
}

export interface ListItem extends Thing {
	'@type': 'ListItem'
	position: number
	item: Thing | string
}

export interface FAQPage extends Thing {
	'@type': 'FAQPage'
	mainEntity: Question[]
}

export interface Question extends Thing {
	'@type': 'Question'
	acceptedAnswer: Answer
}

export interface Answer extends Thing {
	'@type': 'Answer'
	text: string
}

export interface SearchAction extends Thing {
	'@type': 'SearchAction'
	target: string
	'query-input'?: string
}

export interface SpeakableSpecification extends Thing {
	'@type': 'SpeakableSpecification'
	cssSelector?: string[]
	xpath?: string[]
}

export interface HowTo extends Thing {
	'@type': 'HowTo'
	step: HowToStep[]
	totalTime?: string
	estimatedCost?: MonetaryAmount
	supply?: HowToSupply[]
	tool?: HowToTool[]
}

export interface HowToStep extends Thing {
	'@type': 'HowToStep'
	text: string
	position?: number
	image?: string | ImageObject
}

export interface HowToSupply extends Thing {
	'@type': 'HowToSupply'
}

export interface HowToTool extends Thing {
	'@type': 'HowToTool'
}

export interface MonetaryAmount extends Thing {
	'@type': 'MonetaryAmount'
	currency: string
	value: number
}

export interface Event extends Thing {
	'@type': 'Event'
	startDate?: string
	endDate?: string
	location?: Place | string
	organizer?: Organization | Person
	performer?: Person | Organization
	offers?: Offer | Offer[]
	eventStatus?: string
	eventAttendanceMode?: string
}

export interface Place extends Thing {
	'@type': 'Place'
	address?: PostalAddress | string
	geo?: GeoCoordinates
}

export interface GeoCoordinates extends Thing {
	'@type': 'GeoCoordinates'
	latitude: number
	longitude: number
}

// =============================================================================
// JSON-LD Document Wrapper
// =============================================================================

export interface JsonLdDocument<T extends Thing = Thing> {
	'@context': 'https://schema.org'
	'@graph'?: T[]
}

// =============================================================================
// Builder Functions
// =============================================================================

/**
 * Create a JSON-LD document with proper context
 */
export function createJsonLd<T extends Thing>(data: T | T[]): JsonLdDocument<T> {
	if (Array.isArray(data)) {
		return {
			'@context': 'https://schema.org',
			'@graph': data,
		}
	}
	return {
		'@context': 'https://schema.org',
		...data,
	} as JsonLdDocument<T>
}

/**
 * Create a WebPage schema
 */
export function createWebPage(options: {
	name: string
	description?: string
	url?: string
	datePublished?: string
	dateModified?: string
	breadcrumbs?: Array<{ name: string; url: string }>
}): WebPage {
	const page: WebPage = {
		'@type': 'WebPage',
		name: options.name,
		description: options.description,
		url: options.url,
		datePublished: options.datePublished,
		dateModified: options.dateModified,
	}

	if (options.breadcrumbs && options.breadcrumbs.length > 0) {
		page.breadcrumb = {
			'@type': 'BreadcrumbList',
			itemListElement: options.breadcrumbs.map((crumb, index) => ({
				'@type': 'ListItem' as const,
				position: index + 1,
				item: {
					'@type': 'WebPage' as const,
					'@id': crumb.url,
					name: crumb.name,
					url: crumb.url,
				},
			})),
		}
	}

	return page
}

/**
 * Create an Article schema
 */
export function createArticle(options: {
	headline: string
	description?: string
	author?: { name: string; url?: string }
	publisher?: { name: string; logo?: string }
	datePublished?: string
	dateModified?: string
	image?: string
	keywords?: string[]
	wordCount?: number
	type?: 'Article' | 'NewsArticle' | 'BlogPosting' | 'TechArticle'
}): Article {
	const article: Article = {
		'@type': options.type ?? 'Article',
		headline: options.headline,
		description: options.description,
		datePublished: options.datePublished,
		dateModified: options.dateModified,
		image: options.image,
		keywords: options.keywords,
		wordCount: options.wordCount,
	}

	if (options.author) {
		article.author = {
			'@type': 'Person',
			name: options.author.name,
			url: options.author.url,
		}
	}

	if (options.publisher) {
		article.publisher = {
			'@type': 'Organization',
			name: options.publisher.name,
			logo: options.publisher.logo
				? {
						'@type': 'ImageObject',
						url: options.publisher.logo,
					}
				: undefined,
		}
	}

	return article
}

/**
 * Create a Product schema
 */
export function createProduct(options: {
	name: string
	description?: string
	image?: string
	sku?: string
	brand?: string
	price?: number
	currency?: string
	availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued'
	rating?: { value: number; count: number }
}): Product {
	const product: Product = {
		'@type': 'Product',
		name: options.name,
		description: options.description,
		image: options.image,
		sku: options.sku,
	}

	if (options.brand) {
		product.brand = {
			'@type': 'Brand',
			name: options.brand,
		}
	}

	if (options.price !== undefined) {
		product.offers = {
			'@type': 'Offer',
			price: options.price,
			priceCurrency: options.currency ?? 'USD',
			availability: options.availability
				? `https://schema.org/${options.availability}`
				: undefined,
		}
	}

	if (options.rating) {
		product.aggregateRating = {
			'@type': 'AggregateRating',
			ratingValue: options.rating.value,
			reviewCount: options.rating.count,
		}
	}

	return product
}

/**
 * Create an Organization schema
 */
export function createOrganization(options: {
	name: string
	description?: string
	url?: string
	logo?: string
	email?: string
	telephone?: string
	address?: {
		street?: string
		city?: string
		region?: string
		postalCode?: string
		country?: string
	}
	socialProfiles?: string[]
}): Organization {
	const org: Organization = {
		'@type': 'Organization',
		name: options.name,
		description: options.description,
		url: options.url,
		sameAs: options.socialProfiles,
	}

	if (options.logo) {
		org.logo = {
			'@type': 'ImageObject',
			url: options.logo,
		}
	}

	if (options.email || options.telephone) {
		org.contactPoint = [
			{
				'@type': 'ContactPoint',
				email: options.email,
				telephone: options.telephone,
				contactType: 'customer service',
			},
		]
	}

	if (options.address) {
		org.address = {
			'@type': 'PostalAddress',
			streetAddress: options.address.street,
			addressLocality: options.address.city,
			addressRegion: options.address.region,
			postalCode: options.address.postalCode,
			addressCountry: options.address.country,
		}
	}

	return org
}

/**
 * Create a FAQ schema
 */
export function createFAQ(
	questions: Array<{ question: string; answer: string }>,
): FAQPage {
	return {
		'@type': 'FAQPage',
		mainEntity: questions.map((q) => ({
			'@type': 'Question' as const,
			name: q.question,
			acceptedAnswer: {
				'@type': 'Answer' as const,
				text: q.answer,
			},
		})),
	}
}

/**
 * Create a HowTo schema
 */
export function createHowTo(options: {
	name: string
	description?: string
	steps: Array<{ text: string; image?: string }>
	totalTime?: string
	image?: string
}): HowTo {
	return {
		'@type': 'HowTo',
		name: options.name,
		description: options.description,
		image: options.image,
		totalTime: options.totalTime,
		step: options.steps.map((step, index) => ({
			'@type': 'HowToStep' as const,
			position: index + 1,
			text: step.text,
			image: step.image,
		})),
	}
}

/**
 * Create an Event schema
 */
export function createEvent(options: {
	name: string
	description?: string
	startDate: string
	endDate?: string
	location?: { name: string; address?: string }
	organizer?: { name: string; url?: string }
	image?: string
	eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled'
	eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode'
}): Event {
	const event: Event = {
		'@type': 'Event',
		name: options.name,
		description: options.description,
		startDate: options.startDate,
		endDate: options.endDate,
		image: options.image,
		eventStatus: options.eventStatus
			? `https://schema.org/${options.eventStatus}`
			: undefined,
		eventAttendanceMode: options.eventAttendanceMode
			? `https://schema.org/${options.eventAttendanceMode}`
			: undefined,
	}

	if (options.location) {
		event.location = {
			'@type': 'Place',
			name: options.location.name,
			address: options.location.address,
		}
	}

	if (options.organizer) {
		event.organizer = {
			'@type': 'Organization',
			name: options.organizer.name,
			url: options.organizer.url,
		}
	}

	return event
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize JSON-LD to script tag content
 */
export function serializeJsonLd<T extends Thing>(data: T | T[]): string {
	const doc = createJsonLd(data)
	return JSON.stringify(doc, null, 2)
}

/**
 * Generate JSON-LD script tag
 */
export function generateJsonLdScript<T extends Thing>(data: T | T[]): string {
	const json = serializeJsonLd(data)
	return `<script type="application/ld+json">\n${json}\n</script>`
}

// =============================================================================
// Detection / Inference
// =============================================================================

/**
 * Infer page type from HTML content
 */
export function inferPageType(html: string): 'article' | 'product' | 'faq' | 'howto' | 'generic' {
	const lowerHtml = html.toLowerCase()

	// Check for product indicators
	if (
		lowerHtml.includes('add to cart') ||
		lowerHtml.includes('add-to-cart') ||
		lowerHtml.includes('buy now') ||
		lowerHtml.includes('price') ||
		lowerHtml.includes('$')
	) {
		return 'product'
	}

	// Check for FAQ indicators
	if (
		lowerHtml.includes('faq') ||
		lowerHtml.includes('frequently asked') ||
		(lowerHtml.match(/<details/gi)?.length ?? 0) >= 3
	) {
		return 'faq'
	}

	// Check for HowTo indicators
	if (
		lowerHtml.includes('step 1') ||
		lowerHtml.includes('step-by-step') ||
		lowerHtml.includes('instructions') ||
		lowerHtml.includes('how to')
	) {
		return 'howto'
	}

	// Check for article indicators
	if (
		lowerHtml.includes('<article') ||
		lowerHtml.includes('author') ||
		lowerHtml.includes('published') ||
		lowerHtml.includes('blog')
	) {
		return 'article'
	}

	return 'generic'
}

/**
 * Extract title from HTML
 */
export function extractTitle(html: string): string | null {
	// Try <title> tag
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
	if (titleMatch) return titleMatch[1].trim()

	// Try <h1> tag
	const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
	if (h1Match) return h1Match[1].trim()

	// Try og:title
	const ogMatch = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
	if (ogMatch) return ogMatch[1].trim()

	return null
}

/**
 * Extract description from HTML
 */
export function extractDescription(html: string): string | null {
	// Try meta description
	const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
	if (metaMatch) return metaMatch[1].trim()

	// Try og:description
	const ogMatch = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
	if (ogMatch) return ogMatch[1].trim()

	// Try first <p> tag
	const pMatch = html.match(/<p[^>]*>([^<]{50,200})/i)
	if (pMatch) return pMatch[1].trim()

	return null
}

export default {
	createJsonLd,
	createWebPage,
	createArticle,
	createProduct,
	createOrganization,
	createFAQ,
	createHowTo,
	createEvent,
	serializeJsonLd,
	generateJsonLdScript,
	inferPageType,
	extractTitle,
	extractDescription,
}

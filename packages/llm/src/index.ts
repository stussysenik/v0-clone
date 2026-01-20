import {
	type LLMConfig,
	type LLMMessage,
	type LLMProvider,
	type LLMProviderInterface,
	type LLMResponse,
	type LLMStreamChunk,
	type HealthCheckResult,
	devLog,
} from '@v0-clone/shared'

import { ClaudeProvider } from './providers/claude'
import { LMStudioProvider } from './providers/lmstudio'
import { OllamaProvider } from './providers/ollama'
import { OpenAIProvider } from './providers/openai'
import { ZhipuProvider } from './providers/zhipu'

export { ClaudeProvider } from './providers/claude'
export { LMStudioProvider } from './providers/lmstudio'
export { OpenAIProvider } from './providers/openai'
export { OllamaProvider } from './providers/ollama'
export { ZhipuProvider } from './providers/zhipu'

// =============================================================================
// Provider Registry
// =============================================================================

type ProviderConstructor = new (config?: Partial<LLMConfig>) => LLMProviderInterface

const providerRegistry: Record<LLMProvider, ProviderConstructor> = {
	claude: ClaudeProvider,
	openai: OpenAIProvider,
	ollama: OllamaProvider,
	zhipu: ZhipuProvider,
	lmstudio: LMStudioProvider,
	custom: ClaudeProvider, // Default fallback
}

/**
 * Register a custom provider
 */
export function registerProvider(name: LLMProvider, provider: ProviderConstructor): void {
	providerRegistry[name] = provider
	devLog('llm', `Registered provider: ${name}`)
}

// =============================================================================
// LLM Manager - Hot-swappable Provider System
// =============================================================================

export class LLMManager {
	private currentProvider: LLMProviderInterface
	private config: LLMConfig

	constructor(config?: Partial<LLMConfig>) {
		const providerName = config?.provider ?? this.detectProvider()

		// Auto-fetch credentials from env when not explicitly provided
		const apiKey = config?.apiKey ?? this.getApiKeyFromEnv(providerName)
		const baseUrl = config?.baseUrl ?? this.getBaseUrlFromEnv(providerName)

		this.config = {
			provider: providerName,
			model: config?.model ?? this.getDefaultModel(providerName),
			apiKey,
			baseUrl,
			maxTokens: config?.maxTokens ?? 4096,
			temperature: config?.temperature ?? 0.7,
		}

		const ProviderClass = providerRegistry[providerName]
		this.currentProvider = new ProviderClass(this.config)

		devLog('llm', `LLM Manager initialized`, {
			provider: providerName,
			model: this.config.model,
		})
	}

	/**
	 * Get API key from environment for provider
	 */
	private getApiKeyFromEnv(provider: LLMProvider): string | undefined {
		switch (provider) {
			case 'claude':
				return process.env.ANTHROPIC_API_KEY
			case 'openai':
				return process.env.OPENAI_API_KEY
			case 'zhipu':
				return process.env.ZHIPU_API_KEY
			default:
				return undefined
		}
	}

	/**
	 * Get base URL from environment for provider
	 */
	private getBaseUrlFromEnv(provider: LLMProvider): string | undefined {
		switch (provider) {
			case 'ollama':
				return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
			case 'lmstudio':
				return process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1'
			case 'zhipu':
				return process.env.ZHIPU_BASE_URL
			default:
				return undefined
		}
	}

	/**
	 * Detect provider from environment variables
	 * Priority: LLM_PROVIDER env var > API key detection > ollama (default)
	 */
	private detectProvider(): LLMProvider {
		// 1. Explicit provider override takes precedence
		const explicit = process.env.LLM_PROVIDER as LLMProvider | undefined
		if (explicit && ['claude', 'openai', 'ollama', 'zhipu', 'lmstudio'].includes(explicit)) {
			return explicit
		}

		// 2. Auto-detect from API keys
		if (process.env.ANTHROPIC_API_KEY) return 'claude'
		if (process.env.OPENAI_API_KEY) return 'openai'
		if (process.env.ZHIPU_API_KEY) return 'zhipu'

		// 3. Default to local Ollama
		return 'ollama'
	}

	/**
	 * Get default model for provider
	 * Supports LLM_MODEL env var override
	 */
	private getDefaultModel(provider: LLMProvider): string {
		// Allow explicit model override via env var
		if (process.env.LLM_MODEL) return process.env.LLM_MODEL

		switch (provider) {
			case 'claude':
				return 'claude-sonnet-4-20250514'
			case 'openai':
				return 'gpt-4o'
			case 'ollama':
				return 'codellama:13b' // Better for code generation than llama3.2
			case 'lmstudio':
				return 'devstral-small-2'
			case 'zhipu':
				return 'glm-4.7-flash'
			default:
				return 'claude-sonnet-4-20250514'
		}
	}

	/**
	 * Hot-swap to a different provider without restarting
	 */
	switchProvider(provider: LLMProvider, config?: Partial<LLMConfig>): void {
		const newConfig: LLMConfig = {
			...this.config,
			provider,
			model: config?.model ?? this.getDefaultModel(provider),
			...config,
		}

		const ProviderClass = providerRegistry[provider]
		this.currentProvider = new ProviderClass(newConfig)
		this.config = newConfig

		devLog('llm', `Switched provider`, {
			from: this.config.provider,
			to: provider,
			model: newConfig.model,
		})
	}

	/**
	 * Get current provider info
	 */
	getProviderInfo(): { provider: LLMProvider; model: string } {
		return {
			provider: this.config.provider,
			model: this.config.model,
		}
	}

	/**
	 * Generate a response (non-streaming)
	 */
	async generate(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
		return this.currentProvider.generate(messages, config)
	}

	/**
	 * Stream a response
	 */
	stream(
		messages: LLMMessage[],
		config?: Partial<LLMConfig>,
	): AsyncGenerator<LLMStreamChunk, void, unknown> {
		return this.currentProvider.stream(messages, config)
	}

	/**
	 * Test connection to the current provider
	 */
	async testConnection(): Promise<HealthCheckResult> {
		devLog('llm', `Testing connection to ${this.config.provider}`)
		return this.currentProvider.testConnection()
	}

	/**
	 * Base system prompt with tech stack info
	 */
	private getBaseSystemPrompt(): string {
		return `## TECHNOLOGY STACK
- **Framework**: Svelte 5 with Runes ($state, $props, $derived, $effect, $bindable)
- **Styling**: TailwindCSS v4 with CSS variables for theming
- **Icons**: Use inline SVG for icons (don't import external libraries)

## SVELTE 5 PATTERNS
\`\`\`svelte
<script lang="ts">
  // Reactive state with $state
  let count = $state(0)
  let isOpen = $state(false)
  let items = $state<string[]>([])

  // Derived values with $derived
  const doubled = $derived(count * 2)
</script>
\`\`\`

## TAILWIND BEST PRACTICES
- Use standard Tailwind classes: bg-blue-600, text-gray-100, etc.
- For dark backgrounds use: bg-gray-900, bg-slate-900, bg-zinc-900
- For cards/surfaces use: bg-white dark:bg-gray-800
- Use responsive prefixes: sm:, md:, lg:, xl:
- Prefer gap over margins for flex/grid layouts

## IMAGES - CRITICAL
Use real Unsplash URLs that actually work:
- Hero backgrounds: https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop
- Avatars/People: https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face
- Products: https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop
- Office/Work: https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop
- Nature: https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop
- Tech/Abstract: https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop

NEVER use placeholder.com, via.placeholder.com, or placehold.it - these don't render.

## ACCESSIBILITY
- All interactive elements must be keyboard accessible
- Use aria-label for icon-only buttons
- Provide focus indicators: focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
- Use semantic HTML: <nav>, <main>, <section>, <article>, <footer>

## OUTPUT REQUIREMENTS
1. Output ONLY valid Svelte component code
2. No imports for external packages (except types from 'svelte' if needed)
3. Use realistic content - never "Lorem ipsum" or "placeholder"
4. Include hover/focus states for interactive elements
5. Make everything responsive (mobile-first)`
	}

	/**
	 * Get system prompt based on intent
	 */
	getSystemPromptForIntent(intent: 'component' | 'section' | 'page' | 'app'): string {
		const base = this.getBaseSystemPrompt()

		switch (intent) {
			case 'page':
				return `You are building a COMPLETE, PRODUCTION-READY landing page or website.

${base}

## PAGE STRUCTURE - REQUIRED
Your output MUST include ALL of these sections in order:

1. **Navigation** - Fixed header with logo, nav links, and CTA button
2. **Hero Section** - Full-width hero with headline, subheadline, CTA, and background/image
3. **Features Section** - 3-4 feature cards with icons and descriptions
4. **Social Proof** - Testimonials, logos, or stats
5. **CTA Section** - Call-to-action with compelling copy
6. **Footer** - Links, social icons, copyright

## PAGE TEMPLATE
\`\`\`svelte
<script lang="ts">
  let mobileMenuOpen = $state(false)
</script>

<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-blue-600 rounded-lg"></div>
        <span class="font-bold text-xl">Brand</span>
      </div>
      <!-- Desktop Nav -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#features" class="text-gray-600 hover:text-gray-900">Features</a>
        <a href="#pricing" class="text-gray-600 hover:text-gray-900">Pricing</a>
        <a href="#about" class="text-gray-600 hover:text-gray-900">About</a>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Get Started
        </button>
      </div>
      <!-- Mobile menu button -->
      <button class="md:hidden p-2" onclick={() => mobileMenuOpen = !mobileMenuOpen}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section class="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50 to-indigo-100">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
      Your Compelling Headline Here
    </h1>
    <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
      Describe the main value proposition in one or two sentences.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button class="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-blue-700">
        Primary CTA
      </button>
      <button class="border-2 border-gray-300 px-8 py-3 rounded-lg text-lg hover:border-gray-400">
        Secondary CTA
      </button>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="py-20 bg-white">
  <!-- 3-4 feature cards -->
</section>

<!-- Testimonials / Social Proof -->
<section class="py-20 bg-gray-50">
  <!-- Testimonial cards -->
</section>

<!-- CTA Section -->
<section class="py-20 bg-blue-600 text-white">
  <!-- Final call to action -->
</section>

<!-- Footer -->
<footer class="bg-gray-900 text-gray-400 py-12">
  <!-- Footer content -->
</footer>
\`\`\`

CRITICAL: Generate ALL sections with realistic content. No placeholders.`

			case 'app':
				return `You are building a COMPLETE, FUNCTIONAL web application with working state management.

${base}

## APP REQUIREMENTS
1. **Functional state management** - Use $state for all interactive data
2. **Working interactions** - All buttons, forms, and controls must work
3. **App shell** - Include header, sidebar (if appropriate), and main content area
4. **Realistic data** - Pre-populate with example data

## APP TEMPLATE
\`\`\`svelte
<script lang="ts">
  // Define your data types
  interface Item {
    id: string
    title: string
    completed: boolean
  }

  // App state
  let items = $state<Item[]>([
    { id: '1', title: 'Example item 1', completed: false },
    { id: '2', title: 'Example item 2', completed: true },
  ])
  let newItemText = $state('')
  let filter = $state<'all' | 'active' | 'completed'>('all')

  // Derived state
  const filteredItems = $derived(
    items.filter(item => {
      if (filter === 'active') return !item.completed
      if (filter === 'completed') return item.completed
      return true
    })
  )

  // Actions
  function addItem() {
    if (!newItemText.trim()) return
    items = [...items, { id: crypto.randomUUID(), title: newItemText, completed: false }]
    newItemText = ''
  }

  function toggleItem(id: string) {
    items = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    )
  }

  function deleteItem(id: string) {
    items = items.filter(item => item.id !== id)
  }
</script>

<!-- App Header -->
<header class="bg-white border-b border-gray-200 px-6 py-4">
  <h1 class="text-2xl font-bold">App Name</h1>
</header>

<!-- Main Content -->
<main class="max-w-4xl mx-auto p-6">
  <!-- Your app content -->
</main>
\`\`\`

Make the app fully functional with realistic interactions and data.`

			case 'section':
				return `You are building a single, polished section for a webpage.

${base}

## SECTION GUIDELINES
- Focus on ONE specific section (hero, features, pricing, etc.)
- Use full-width layouts with max-w-7xl container
- Include padding: py-16 or py-20 for vertical spacing
- Make it self-contained but designed to fit within a page

## SECTION TEMPLATE
\`\`\`svelte
<section class="py-20 bg-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Section header -->
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Section Headline
      </h2>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        Section description goes here.
      </p>
    </div>

    <!-- Section content -->
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Items -->
    </div>
  </div>
</section>
\`\`\`

Create a complete, production-ready section with realistic content.`

			case 'component':
			default:
				return `You are building a single, reusable UI component.

${base}

## COMPONENT GUIDELINES
- Focus on a single, self-contained component
- Include all necessary state within the component
- Support common props (variant, size, disabled, etc.)
- Include hover, focus, and active states

## COMPONENT TEMPLATE
\`\`\`svelte
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    onclick?: () => void
  }

  let { variant = 'primary', size = 'md', disabled = false, onclick }: Props = $props()

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

  const variantClasses = $derived({
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:bg-gray-50',
    outline: 'border-2 border-gray-300 hover:border-gray-400 disabled:border-gray-200'
  }[variant])

  const sizeClasses = $derived({
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }[size])
</script>

<button
  class="{baseClasses} {variantClasses} {sizeClasses}"
  {disabled}
  {onclick}
>
  Button Text
</button>
\`\`\`

Create a polished, reusable component.`
		}
	}

	/**
	 * System prompt for high-quality UI component generation (default)
	 */
	private getSystemPrompt(): string {
		return this.getSystemPromptForIntent('component')
	}

	/**
	 * Generate UI component code from a prompt
	 */
	async generateComponent(
		prompt: string,
		intent: 'component' | 'section' | 'page' | 'app' = 'component',
	): Promise<string> {
		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: this.getSystemPromptForIntent(intent),
			},
			{
				role: 'user',
				content: prompt,
			},
		]

		devLog('llm', `Generating ${intent}`, { promptLength: prompt.length })
		const response = await this.generate(messages)
		return this.extractCode(response.content)
	}

	/**
	 * Stream UI component generation
	 */
	async *streamComponent(
		prompt: string,
		intent: 'component' | 'section' | 'page' | 'app' = 'component',
	): AsyncGenerator<string, void, unknown> {
		const messages: LLMMessage[] = [
			{
				role: 'system',
				content: this.getSystemPromptForIntent(intent),
			},
			{
				role: 'user',
				content: prompt,
			},
		]

		devLog('llm', `Streaming ${intent}`, { promptLength: prompt.length })
		for await (const chunk of this.stream(messages)) {
			if (chunk.content) {
				yield chunk.content
			}
		}
	}

	/**
	 * Extract code from markdown code blocks
	 */
	private extractCode(content: string): string {
		// Match ```svelte or ```html or just ```
		const codeBlockMatch = content.match(/```(?:svelte|html)?\n([\s\S]*?)```/)
		if (codeBlockMatch) {
			return codeBlockMatch[1].trim()
		}
		return content.trim()
	}
}

// =============================================================================
// Default Export - Singleton Instance
// =============================================================================

let defaultManager: LLMManager | null = null

export function getLLM(config?: Partial<LLMConfig>): LLMManager {
	if (!defaultManager || config) {
		defaultManager = new LLMManager(config)
	}
	return defaultManager
}

export default getLLM

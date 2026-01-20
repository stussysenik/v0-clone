<script lang="ts">
	import { onMount } from 'svelte'
	import { PROVIDER_CONFIGS, type LLMProvider, type StudioSettings } from '@v0-clone/shared'

	interface Props {
		onClose: () => void
		onSettingsChange: (settings: StudioSettings) => void
	}

	let { onClose, onSettingsChange }: Props = $props()

	// Settings state
	let provider = $state<LLMProvider>('zhipu')
	let model = $state('glm-4.7-flash')
	let apiKey = $state('')
	let baseUrl = $state('')
	let temperature = $state(0.7)
	let maxTokens = $state(4096)
	let customModel = $state('')
	let showApiKey = $state(false)
	let testingConnection = $state(false)
	let connectionStatus = $state<'idle' | 'success' | 'error'>('idle')
	let connectionError = $state('')

	const providers = Object.values(PROVIDER_CONFIGS)

	// Get current provider config
	const currentProvider = $derived(PROVIDER_CONFIGS[provider])
	const availableModels = $derived(currentProvider?.models ?? [])

	// Load settings from localStorage on mount
	onMount(() => {
		const saved = localStorage.getItem('v0-studio-settings')
		if (saved) {
			try {
				const settings = JSON.parse(saved) as StudioSettings
				provider = settings.provider ?? 'zhipu'
				model = settings.model ?? 'glm-4.7-flash'
				apiKey = settings.apiKey ?? ''
				baseUrl = settings.baseUrl ?? ''
				temperature = settings.temperature ?? 0.7
				maxTokens = settings.maxTokens ?? 4096
			} catch (e) {
				console.warn('Failed to parse saved settings:', e)
			}
		}

		// Set default base URL if needed
		if (!baseUrl && currentProvider?.defaultBaseUrl) {
			baseUrl = currentProvider.defaultBaseUrl
		}
	})

	// Update model when provider changes
	$effect(() => {
		const config = PROVIDER_CONFIGS[provider]
		if (config && config.models.length > 0) {
			// Check if current model exists in new provider
			const modelExists = config.models.some(m => m.id === model)
			if (!modelExists) {
				model = config.models[0].id
			}
		}

		// Update default base URL
		if (config?.defaultBaseUrl && !baseUrl) {
			baseUrl = config.defaultBaseUrl
		}
	})

	function saveSettings() {
		const finalModel = model === 'custom' ? customModel : model
		const settings: StudioSettings = {
			provider,
			model: finalModel,
			apiKey: apiKey || undefined,
			baseUrl: baseUrl || undefined,
			temperature,
			maxTokens,
		}

		localStorage.setItem('v0-studio-settings', JSON.stringify(settings))
		onSettingsChange(settings)
		onClose()
	}

	async function testConnection() {
		testingConnection = true
		connectionStatus = 'idle'
		connectionError = ''

		try {
			const response = await fetch('/api/provider/health', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider,
					model: model === 'custom' ? customModel : model,
					apiKey,
					baseUrl,
				}),
			})

			const result = await response.json()

			if (result.ok) {
				connectionStatus = 'success'
			} else {
				connectionStatus = 'error'
				connectionError = result.error || 'Connection failed'
			}
		} catch (e) {
			connectionStatus = 'error'
			connectionError = e instanceof Error ? e.message : 'Connection test failed'
		} finally {
			testingConnection = false
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose()
		}
	}
</script>

<svelte:window on:keydown={handleKeyDown} />

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/50 z-50 animate-fade-in"
	onclick={onClose}
	role="button"
	tabindex="-1"
></div>

<!-- Panel -->
<div class="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-bg)] border-l border-[var(--color-border)] z-50 overflow-y-auto animate-slide-in-left">
	<!-- Header -->
	<div class="sticky top-0 bg-[var(--color-bg)] border-b border-[var(--color-border)] p-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-[var(--color-text)]">Model Settings</h2>
		<button
			onclick={onClose}
			class="p-2 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div class="p-4 space-y-6">
		<!-- Provider Selection -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-[var(--color-text)]">Provider</label>
			<div class="grid grid-cols-2 gap-2">
				{#each providers as p (p.id)}
					<button
						onclick={() => provider = p.id}
						class="p-3 rounded-lg border text-left transition-all
							{provider === p.id
								? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
								: 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'}"
					>
						<div class="text-sm font-medium text-[var(--color-text)]">{p.name}</div>
						<div class="text-xs text-[var(--color-text-muted)] mt-0.5">{p.description}</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Model Selection -->
		<div class="space-y-2">
			<label class="text-sm font-medium text-[var(--color-text)]">Model</label>
			<select
				bind:value={model}
				class="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]
					text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)]"
			>
				{#each availableModels as m (m.id)}
					<option value={m.id}>
						{m.name} {m.free ? '(Free)' : ''}
					</option>
				{/each}
			</select>
			{#if availableModels.find(m => m.id === model)?.description}
				<p class="text-xs text-[var(--color-text-muted)]">
					{availableModels.find(m => m.id === model)?.description}
				</p>
			{/if}
			{#if model === 'custom'}
				<input
					type="text"
					bind:value={customModel}
					placeholder="Enter model ID..."
					class="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]
						text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
						focus:outline-none focus:border-[var(--color-accent)]"
				/>
			{/if}
		</div>

		<!-- API Key (if required) -->
		{#if currentProvider?.requiresApiKey}
			<div class="space-y-2">
				<label class="text-sm font-medium text-[var(--color-text)]">
					API Key
					{#if currentProvider.apiKeyEnvVar}
						<span class="text-[var(--color-text-muted)] font-normal">
							(or set {currentProvider.apiKeyEnvVar})
						</span>
					{/if}
				</label>
				<div class="relative">
					<input
						type={showApiKey ? 'text' : 'password'}
						bind:value={apiKey}
						placeholder="sk-..."
						class="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]
							text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
							focus:outline-none focus:border-[var(--color-accent)]"
					/>
					<button
						type="button"
						onclick={() => showApiKey = !showApiKey}
						class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
					>
						{#if showApiKey}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
							</svg>
						{:else}
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
						{/if}
					</button>
				</div>
			</div>
		{/if}

		<!-- Base URL (if required) -->
		{#if currentProvider?.requiresBaseUrl}
			<div class="space-y-2">
				<label class="text-sm font-medium text-[var(--color-text)]">
					Base URL
					{#if currentProvider.defaultBaseUrl}
						<span class="text-[var(--color-text-muted)] font-normal">
							(default: {currentProvider.defaultBaseUrl})
						</span>
					{/if}
				</label>
				<input
					type="text"
					bind:value={baseUrl}
					placeholder={currentProvider.defaultBaseUrl || 'https://api.example.com/v1'}
					class="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]
						text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]
						focus:outline-none focus:border-[var(--color-accent)]"
				/>
			</div>
		{/if}

		<!-- Advanced Settings -->
		<details class="group">
			<summary class="text-sm font-medium text-[var(--color-text)] cursor-pointer flex items-center gap-2">
				<svg class="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				Advanced Settings
			</summary>
			<div class="mt-4 space-y-4 pl-6">
				<!-- Temperature -->
				<div class="space-y-2">
					<label class="text-sm text-[var(--color-text-secondary)]">
						Temperature: {temperature.toFixed(1)}
					</label>
					<input
						type="range"
						bind:value={temperature}
						min="0"
						max="2"
						step="0.1"
						class="w-full accent-[var(--color-accent)]"
					/>
					<p class="text-xs text-[var(--color-text-muted)]">
						Lower = more focused, higher = more creative
					</p>
				</div>

				<!-- Max Tokens -->
				<div class="space-y-2">
					<label class="text-sm text-[var(--color-text-secondary)]">
						Max Tokens: {maxTokens}
					</label>
					<input
						type="range"
						bind:value={maxTokens}
						min="256"
						max="16384"
						step="256"
						class="w-full accent-[var(--color-accent)]"
					/>
					<p class="text-xs text-[var(--color-text-muted)]">
						Maximum length of generated response
					</p>
				</div>
			</div>
		</details>

		<!-- Connection Test -->
		<div class="space-y-2">
			<button
				onclick={testConnection}
				disabled={testingConnection}
				class="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)]
					hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
			>
				{#if testingConnection}
					<div class="w-4 h-4 border-2 border-[var(--color-accent)]/30 border-t-[var(--color-accent)] rounded-full animate-spin"></div>
					Testing...
				{:else}
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Test Connection
				{/if}
			</button>

			{#if connectionStatus === 'success'}
				<div class="flex items-center gap-2 text-sm text-green-500">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Connection successful
				</div>
			{:else if connectionStatus === 'error'}
				<div class="flex items-center gap-2 text-sm text-red-500">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
					{connectionError}
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] p-4 flex gap-3">
		<button
			onclick={onClose}
			class="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)]
				hover:bg-[var(--color-bg-tertiary)] transition-colors"
		>
			Cancel
		</button>
		<button
			onclick={saveSettings}
			class="flex-1 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white
				hover:bg-[var(--color-accent-hover)] transition-colors"
		>
			Save Settings
		</button>
	</div>
</div>
</script>

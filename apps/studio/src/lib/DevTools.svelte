<script lang="ts">
	import type { PerformanceAuditResult, ValidationResult, CoreWebVitals } from '@v0-clone/shared'

	interface Props {
		onViewportChange?: (viewport: 'mobile' | 'tablet' | 'desktop') => void
		onGridToggle?: () => void
		onRulerToggle?: () => void
		onOutlinesToggle?: () => void
		onConstraintsToggle?: () => void
		onBaselineToggle?: () => void
		onPerfPanelToggle?: () => void
		onSelectToggle?: () => void
		onScreenshot?: () => void
		performanceAudit?: PerformanceAuditResult | null
		validation?: ValidationResult | null
		cwv?: CoreWebVitals | null
		selectModeActive?: boolean
	}

	let {
		onViewportChange,
		onGridToggle,
		onRulerToggle,
		onOutlinesToggle,
		onConstraintsToggle,
		onBaselineToggle,
		onPerfPanelToggle,
		onSelectToggle,
		onScreenshot,
		performanceAudit = null,
		validation = null,
		cwv = null,
		selectModeActive = false
	}: Props = $props()

	let viewport = $state<'mobile' | 'tablet' | 'desktop'>('desktop')
	let showGrid = $state(false)
	let showRuler = $state(false)
	let showOutlines = $state(false)
	let showConstraints = $state(false)
	let showBaseline = $state(false)
	let showPerfPanel = $state(false)

	function handleViewportChange(newViewport: 'mobile' | 'tablet' | 'desktop') {
		viewport = newViewport
		onViewportChange?.(newViewport)
	}

	function toggleGrid() {
		showGrid = !showGrid
		onGridToggle?.()
	}

	function toggleRuler() {
		showRuler = !showRuler
		onRulerToggle?.()
	}

	function toggleOutlines() {
		showOutlines = !showOutlines
		onOutlinesToggle?.()
	}

	function toggleConstraints() {
		showConstraints = !showConstraints
		onConstraintsToggle?.()
	}

	function toggleBaseline() {
		showBaseline = !showBaseline
		onBaselineToggle?.()
	}

	function togglePerfPanel() {
		showPerfPanel = !showPerfPanel
		onPerfPanelToggle?.()
	}

	// Score color helper
	function getScoreColor(score: number | undefined): string {
		if (score === undefined) return 'text-[var(--color-text-muted)]'
		if (score >= 90) return 'text-green-500'
		if (score >= 70) return 'text-yellow-500'
		return 'text-red-500'
	}
</script>

<div class="dev-toolbar bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] p-2 flex items-center gap-4">
	<!-- Viewport Controls -->
	<div class="viewport-selector flex gap-1 bg-[var(--color-bg-tertiary)] rounded-md p-1">
		<button
			onclick={() => handleViewportChange('mobile')}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth flex items-center gap-1.5
				{viewport === 'mobile' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Mobile view (375px)"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<span>Mobile</span>
		</button>
		<button
			onclick={() => handleViewportChange('tablet')}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth flex items-center gap-1.5
				{viewport === 'tablet' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Tablet view (768px)"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
			</svg>
			<span>Tablet</span>
		</button>
		<button
			onclick={() => handleViewportChange('desktop')}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth flex items-center gap-1.5
				{viewport === 'desktop' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Desktop view (100%)"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
			</svg>
			<span>Desktop</span>
		</button>
	</div>

	<div class="w-px h-6 bg-[var(--color-border)]"></div>

	<!-- Select Mode -->
	<button
		onclick={() => onSelectToggle?.()}
		class="px-3 py-1.5 text-xs rounded transition-all-smooth flex items-center gap-1.5
			{selectModeActive ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
		title="Element selector (⌘+Shift+C)"
	>
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
		</svg>
		<span>Select</span>
	</button>

	<div class="w-px h-6 bg-[var(--color-border)]"></div>

	<!-- Dev Overlays -->
	<div class="dev-toggles flex gap-1">
		<button
			onclick={toggleGrid}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth
				{showGrid ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Toggle grid overlay"
		>
			Grid
		</button>
		<button
			onclick={toggleRuler}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth
				{showRuler ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Toggle rulers"
		>
			Rulers
		</button>
		<button
			onclick={toggleOutlines}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth
				{showOutlines ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Toggle element outlines"
		>
			Outlines
		</button>
		<button
			onclick={toggleConstraints}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth
				{showConstraints ? 'bg-purple-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Toggle flex/grid constraints"
		>
			Constraints
		</button>
		<button
			onclick={toggleBaseline}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth
				{showBaseline ? 'bg-red-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Toggle baseline rhythm"
		>
			Baseline
		</button>
	</div>

	<div class="w-px h-6 bg-[var(--color-border)]"></div>

	<!-- Quality Indicators -->
	<div class="flex items-center gap-2">
		<!-- Performance Score -->
		<button
			onclick={togglePerfPanel}
			class="px-3 py-1.5 text-xs rounded transition-all-smooth flex items-center gap-1.5
				{showPerfPanel ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
			title="Performance metrics"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			<span class={getScoreColor(performanceAudit?.score)}>
				{performanceAudit?.score ?? '—'}
			</span>
		</button>

		<!-- Validation Score -->
		<div
			class="px-3 py-1.5 text-xs rounded bg-[var(--color-bg-tertiary)] flex items-center gap-1.5"
			title="Validation score"
		>
			<svg class="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span class={getScoreColor(validation?.score)}>
				{validation?.score ?? '—'}
			</span>
			{#if validation && validation.summary.errors > 0}
				<span class="text-red-500 text-[10px]">({validation.summary.errors})</span>
			{/if}
		</div>

		<!-- CWV Quick View -->
		{#if cwv}
			<div
				class="px-2 py-1 text-[10px] rounded bg-[var(--color-bg-tertiary)] flex items-center gap-2"
				title="Core Web Vitals"
			>
				<span class="text-[var(--color-text-muted)]">LCP:</span>
				<span class={cwv.lcp && cwv.lcp < 2500 ? 'text-green-500' : cwv.lcp && cwv.lcp < 4000 ? 'text-yellow-500' : 'text-[var(--color-text-muted)]'}>
					{cwv.lcp ? `${Math.round(cwv.lcp)}` : '—'}
				</span>
				<span class="text-[var(--color-text-muted)]">CLS:</span>
				<span class={cwv.cls !== null && cwv.cls < 0.1 ? 'text-green-500' : cwv.cls !== null && cwv.cls < 0.25 ? 'text-yellow-500' : 'text-[var(--color-text-muted)]'}>
					{cwv.cls !== null ? cwv.cls.toFixed(3) : '—'}
				</span>
			</div>
		{/if}
	</div>

	<div class="flex-1"></div>

	<!-- Screenshot Button -->
	<button
		onclick={() => onScreenshot?.()}
		class="px-3 py-1.5 text-xs rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all-smooth flex items-center gap-1.5"
		title="Take screenshot (⌘+Shift+S)"
	>
		<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
		<span>Screenshot</span>
	</button>
</div>

<script lang="ts">
	import { onMount } from 'svelte'
	import {
		type BaselineRhythmConfig,
		type TypographyScale,
		type TypographyScaleType,
		TYPOGRAPHY_SCALE_RATIOS
	} from '@v0-clone/shared'

	interface Props {
		previewIframe?: HTMLIFrameElement | null
		rhythmConfig?: Partial<BaselineRhythmConfig>
		scaleConfig?: Partial<TypographyScale>
		onRhythmChange?: (config: BaselineRhythmConfig) => void
		onScaleChange?: (config: TypographyScale) => void
	}

	let {
		previewIframe = null,
		rhythmConfig = {},
		scaleConfig = {},
		onRhythmChange,
		onScaleChange
	}: Props = $props()

	// Default configurations
	const defaultRhythm: BaselineRhythmConfig = {
		enabled: true,
		unit: 8,
		showLines: true,
		highlightViolations: true,
	}

	const defaultScale: TypographyScale = {
		type: 'perfect-fourth',
		baseSize: 16,
		levels: 6,
	}

	let currentRhythm = $state<BaselineRhythmConfig>({ ...defaultRhythm, ...rhythmConfig })
	let currentScale = $state<TypographyScale>({ ...defaultScale, ...scaleConfig })
	let showSettings = $state(false)
	let containerHeight = $state(0)

	// Violations detected from iframe
	let violations = $state<Array<{
		element: string
		x: number
		y: number
		height: number
		actualLineHeight: number
		expectedLineHeight: number
	}>>([])

	// Calculate typography scale values
	const scaleValues = $derived(() => {
		const ratio = TYPOGRAPHY_SCALE_RATIOS[currentScale.type]
		const values: Array<{ level: number; size: number; lineHeight: number }> = []

		for (let i = -Math.floor(currentScale.levels / 2); i <= Math.ceil(currentScale.levels / 2); i++) {
			const size = Math.round(currentScale.baseSize * Math.pow(ratio, i) * 100) / 100
			const lineHeight = Math.ceil(size / currentRhythm.unit) * currentRhythm.unit
			values.push({ level: i, size, lineHeight })
		}

		return values.sort((a, b) => a.size - b.size)
	})

	// Number of baseline grid lines
	const gridLineCount = $derived(Math.ceil(containerHeight / currentRhythm.unit))

	const scaleOptions: { value: TypographyScaleType; label: string; ratio: string }[] = [
		{ value: 'minor-second', label: 'Minor 2nd', ratio: '1.067' },
		{ value: 'major-second', label: 'Major 2nd', ratio: '1.125' },
		{ value: 'minor-third', label: 'Minor 3rd', ratio: '1.200' },
		{ value: 'major-third', label: 'Major 3rd', ratio: '1.250' },
		{ value: 'perfect-fourth', label: 'Perfect 4th', ratio: '1.333' },
		{ value: 'perfect-fifth', label: 'Perfect 5th', ratio: '1.500' },
		{ value: 'golden-ratio', label: 'Golden φ', ratio: '1.618' },
	]

	function updateRhythm(updates: Partial<BaselineRhythmConfig>) {
		currentRhythm = { ...currentRhythm, ...updates }
		onRhythmChange?.(currentRhythm)
	}

	function updateScale(updates: Partial<TypographyScale>) {
		currentScale = { ...currentScale, ...updates }
		onScaleChange?.(currentScale)
	}

	onMount(() => {
		const updateHeight = () => {
			containerHeight = window.innerHeight
		}

		updateHeight()
		window.addEventListener('resize', updateHeight)

		// Listen for violations from iframe
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === 'baselineViolations') {
				violations = event.data.payload ?? []
			}
		}
		window.addEventListener('message', handleMessage)

		return () => {
			window.removeEventListener('resize', updateHeight)
			window.removeEventListener('message', handleMessage)
		}
	})

	// Request baseline check from iframe
	function requestBaselineCheck() {
		if (!previewIframe?.contentWindow) return

		previewIframe.contentWindow.postMessage({
			type: 'checkBaselineRhythm',
			payload: { unit: currentRhythm.unit },
			timestamp: Date.now()
		}, '*')
	}

	$effect(() => {
		if (currentRhythm.highlightViolations) {
			requestBaselineCheck()
		}
	})
</script>

<div class="baseline-overlay pointer-events-none absolute inset-0 z-[9996]">
	<!-- Baseline rhythm grid lines -->
	{#if currentRhythm.showLines}
		{#each Array(gridLineCount) as _, i}
			<div
				class="absolute left-0 right-0 h-px"
				style="
					top: {i * currentRhythm.unit}px;
					background: {i % 4 === 0
						? 'rgba(239, 68, 68, 0.2)'
						: 'rgba(239, 68, 68, 0.08)'};
				"
			></div>
		{/each}
	{/if}

	<!-- Violation highlights -->
	{#if currentRhythm.highlightViolations}
		{#each violations as violation}
			<div
				class="absolute border-2 border-red-500 bg-red-500/10"
				style="
					left: {violation.x}px;
					top: {violation.y}px;
					width: 100%;
					height: {violation.height}px;
				"
			>
				<div class="absolute -top-5 left-0 bg-red-500 text-white px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap">
					{violation.element}: {violation.actualLineHeight}px (expected {violation.expectedLineHeight}px)
				</div>
			</div>
		{/each}
	{/if}
</div>

<!-- Settings Panel -->
<div class="absolute top-8 right-26 z-[10000] pointer-events-auto">
	<button
		onclick={() => showSettings = !showSettings}
		class="p-1.5 rounded bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
		title="Typography & Rhythm"
	>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16" />
		</svg>
	</button>

	{#if showSettings}
		<div class="absolute top-full right-0 mt-1 w-56 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-lg border border-[var(--color-border)] shadow-lg overflow-hidden">
			<div class="p-2 border-b border-[var(--color-border)]">
				<span class="text-xs font-medium text-[var(--color-text)]">Typography & Rhythm</span>
			</div>

			<!-- Baseline Rhythm Section -->
			<div class="p-2 space-y-2 border-b border-[var(--color-border)]">
				<div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Baseline Rhythm</div>

				<div class="flex gap-1">
					<button
						onclick={() => updateRhythm({ unit: 4 })}
						class="flex-1 px-2 py-1 text-[10px] rounded transition-colors
							{currentRhythm.unit === 4
								? 'bg-[var(--color-accent)] text-white'
								: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
					>
						4px
					</button>
					<button
						onclick={() => updateRhythm({ unit: 8 })}
						class="flex-1 px-2 py-1 text-[10px] rounded transition-colors
							{currentRhythm.unit === 8
								? 'bg-[var(--color-accent)] text-white'
								: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
					>
						8px
					</button>
				</div>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentRhythm.showLines}
						onchange={() => updateRhythm({ showLines: !currentRhythm.showLines })}
						class="rounded border-[var(--color-border)]"
					/>
					Show baseline grid
				</label>

				<label class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
					<input
						type="checkbox"
						checked={currentRhythm.highlightViolations}
						onchange={() => updateRhythm({ highlightViolations: !currentRhythm.highlightViolations })}
						class="rounded border-[var(--color-border)]"
					/>
					Highlight violations
				</label>
			</div>

			<!-- Typography Scale Section -->
			<div class="p-2 space-y-2 border-b border-[var(--color-border)]">
				<div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Type Scale</div>

				<select
					value={currentScale.type}
					onchange={(e) => updateScale({ type: e.currentTarget.value as TypographyScaleType })}
					class="w-full px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
				>
					{#each scaleOptions as option}
						<option value={option.value}>{option.label} ({option.ratio})</option>
					{/each}
				</select>

				<div class="flex items-center gap-2">
					<label class="text-[10px] text-[var(--color-text-muted)]">Base</label>
					<input
						type="number"
						value={currentScale.baseSize}
						onchange={(e) => updateScale({ baseSize: parseInt(e.currentTarget.value) || 16 })}
						class="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded"
						min="10"
						max="24"
					/>
					<span class="text-[10px] text-[var(--color-text-muted)]">px</span>
				</div>
			</div>

			<!-- Scale Preview -->
			<div class="p-2 space-y-1 max-h-48 overflow-y-auto">
				<div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Scale Preview</div>
				{#each scaleValues() as { level, size, lineHeight }}
					<div class="flex items-center justify-between text-[10px] font-mono">
						<span class="text-[var(--color-text-muted)]">
							{level > 0 ? `+${level}` : level}
						</span>
						<span
							class="text-[var(--color-text)]"
							class:font-semibold={level === 0}
						>
							{size}px
						</span>
						<span class="text-[var(--color-text-muted)]">
							/{lineHeight}
						</span>
					</div>
				{/each}
			</div>

			<!-- CSS Output -->
			<div class="p-2 border-t border-[var(--color-border)]">
				<button
					onclick={() => {
						const css = scaleValues()
							.map(({ level, size, lineHeight }) =>
								`--text-${level < 0 ? 'sm' + Math.abs(level) : level === 0 ? 'base' : 'lg' + level}: ${size}px;`
							)
							.join('\n')
						navigator.clipboard.writeText(css)
					}}
					class="w-full px-2 py-1 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] rounded transition-colors"
				>
					Copy CSS Variables
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- Scale Reference Bar (always visible) -->
<div class="absolute left-8 top-32 z-[10000] pointer-events-auto">
	<div class="bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm rounded border border-[var(--color-border)] p-2">
		<div class="text-[9px] text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
			{currentScale.type.replace('-', ' ')}
		</div>
		<div class="space-y-0.5">
			{#each scaleValues().slice(-5) as { level, size }}
				<div
					class="h-1 bg-[var(--color-accent)] rounded-full transition-all"
					style="width: {Math.min(size * 2, 80)}px; opacity: {0.3 + (level + 3) * 0.15}"
					title="{size}px"
				></div>
			{/each}
		</div>
	</div>
</div>

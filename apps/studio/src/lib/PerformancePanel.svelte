<script lang="ts">
	import type {
		CoreWebVitals,
		PerformanceAuditResult,
		PerformanceRecommendation,
		PerformanceThresholds
	} from '@v0-clone/shared'

	interface Props {
		audit?: PerformanceAuditResult | null
		cwv?: CoreWebVitals | null
		thresholds?: Partial<PerformanceThresholds>
		onRefresh?: () => void
	}

	let { audit = null, cwv = null, thresholds = {}, onRefresh }: Props = $props()

	const DEFAULT_THRESHOLDS: PerformanceThresholds = {
		lighthouseScore: 98,
		lcp: 1200,
		cls: 0.1,
		inp: 200,
		maxBundleKb: 50,
	}

	const fullThresholds = $derived({ ...DEFAULT_THRESHOLDS, ...thresholds })

	// Merge audit CWV with runtime CWV
	const mergedCWV = $derived<CoreWebVitals>({
		lcp: cwv?.lcp ?? audit?.cwv.lcp ?? null,
		fid: cwv?.fid ?? audit?.cwv.fid ?? null,
		inp: cwv?.inp ?? audit?.cwv.inp ?? null,
		cls: cwv?.cls ?? audit?.cwv.cls ?? null,
		fcp: cwv?.fcp ?? audit?.cwv.fcp ?? null,
		ttfb: cwv?.ttfb ?? audit?.cwv.ttfb ?? null,
	})

	// Score color
	function getScoreColor(score: number): string {
		if (score >= 90) return 'text-green-500'
		if (score >= 70) return 'text-yellow-500'
		return 'text-red-500'
	}

	// CWV status
	function getCWVStatus(metric: string, value: number | null): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
		if (value === null) return 'unknown'

		switch (metric) {
			case 'lcp':
				if (value <= 2500) return 'good'
				if (value <= 4000) return 'needs-improvement'
				return 'poor'
			case 'fid':
			case 'inp':
				if (value <= 200) return 'good'
				if (value <= 500) return 'needs-improvement'
				return 'poor'
			case 'cls':
				if (value <= 0.1) return 'good'
				if (value <= 0.25) return 'needs-improvement'
				return 'poor'
			case 'fcp':
				if (value <= 1800) return 'good'
				if (value <= 3000) return 'needs-improvement'
				return 'poor'
			case 'ttfb':
				if (value <= 800) return 'good'
				if (value <= 1800) return 'needs-improvement'
				return 'poor'
			default:
				return 'unknown'
		}
	}

	function getStatusColor(status: 'good' | 'needs-improvement' | 'poor' | 'unknown'): string {
		switch (status) {
			case 'good': return 'bg-green-500'
			case 'needs-improvement': return 'bg-yellow-500'
			case 'poor': return 'bg-red-500'
			default: return 'bg-gray-400'
		}
	}

	function formatMetric(metric: string, value: number | null): string {
		if (value === null) return '—'
		if (metric === 'cls') return value.toFixed(3)
		return `${Math.round(value)}ms`
	}

	// Group recommendations by severity
	const groupedRecs = $derived(() => {
		if (!audit?.recommendations) return { warnings: [], infos: [] }
		return {
			warnings: audit.recommendations.filter(r => r.severity === 'warning'),
			infos: audit.recommendations.filter(r => r.severity === 'info'),
		}
	})
</script>

<div class="performance-panel bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between p-3 border-b border-[var(--color-border)]">
		<div class="flex items-center gap-2">
			<svg class="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			<span class="text-sm font-medium text-[var(--color-text)]">Performance</span>
		</div>

		{#if onRefresh}
			<button
				onclick={() => onRefresh?.()}
				class="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
				title="Refresh metrics"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Score -->
	{#if audit}
		<div class="p-4 border-b border-[var(--color-border)]">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Estimated Score</div>
					<div class="text-3xl font-bold {getScoreColor(audit.score)}">{audit.score}</div>
				</div>
				<div class="relative w-16 h-16">
					<svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke="var(--color-border)"
							stroke-width="3"
						/>
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke={audit.score >= 90 ? '#22c55e' : audit.score >= 70 ? '#eab308' : '#ef4444'}
							stroke-width="3"
							stroke-dasharray="{audit.score}, 100"
						/>
					</svg>
					<div class="absolute inset-0 flex items-center justify-center">
						{#if audit.passesThreshold}
							<svg class="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
							</svg>
						{:else}
							<span class="text-xs text-[var(--color-text-muted)]">
								{fullThresholds.lighthouseScore}
							</span>
						{/if}
					</div>
				</div>
			</div>

			{#if !audit.passesThreshold}
				<div class="mt-2 text-xs text-yellow-500">
					Target: ≥{fullThresholds.lighthouseScore}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Core Web Vitals -->
	<div class="p-4 border-b border-[var(--color-border)]">
		<div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
			Core Web Vitals
		</div>

		<div class="grid grid-cols-3 gap-3">
			<!-- LCP -->
			<div class="text-center">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1">LCP</div>
				<div class="flex items-center justify-center gap-1">
					<span class="w-2 h-2 rounded-full {getStatusColor(getCWVStatus('lcp', mergedCWV.lcp))}"></span>
					<span class="text-sm font-mono text-[var(--color-text)]">
						{formatMetric('lcp', mergedCWV.lcp)}
					</span>
				</div>
			</div>

			<!-- CLS -->
			<div class="text-center">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1">CLS</div>
				<div class="flex items-center justify-center gap-1">
					<span class="w-2 h-2 rounded-full {getStatusColor(getCWVStatus('cls', mergedCWV.cls))}"></span>
					<span class="text-sm font-mono text-[var(--color-text)]">
						{formatMetric('cls', mergedCWV.cls)}
					</span>
				</div>
			</div>

			<!-- INP -->
			<div class="text-center">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1">INP</div>
				<div class="flex items-center justify-center gap-1">
					<span class="w-2 h-2 rounded-full {getStatusColor(getCWVStatus('inp', mergedCWV.inp))}"></span>
					<span class="text-sm font-mono text-[var(--color-text)]">
						{formatMetric('inp', mergedCWV.inp)}
					</span>
				</div>
			</div>
		</div>

		<!-- Additional metrics -->
		<div class="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[var(--color-border)]/50">
			<!-- FCP -->
			<div class="text-center">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1">FCP</div>
				<span class="text-xs font-mono text-[var(--color-text-muted)]">
					{formatMetric('fcp', mergedCWV.fcp)}
				</span>
			</div>

			<!-- TTFB -->
			<div class="text-center">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1">TTFB</div>
				<span class="text-xs font-mono text-[var(--color-text-muted)]">
					{formatMetric('ttfb', mergedCWV.ttfb)}
				</span>
			</div>

			<!-- FID (deprecated) -->
			<div class="text-center opacity-50">
				<div class="text-[10px] text-[var(--color-text-muted)] mb-1 line-through">FID</div>
				<span class="text-xs font-mono text-[var(--color-text-muted)]">
					—
				</span>
			</div>
		</div>
	</div>

	<!-- Bundle Size -->
	{#if audit?.bundleSize}
		<div class="p-4 border-b border-[var(--color-border)]">
			<div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
				Bundle Size
			</div>

			<div class="space-y-2">
				<div class="flex justify-between items-center">
					<span class="text-xs text-[var(--color-text-muted)]">HTML</span>
					<span class="text-xs font-mono text-[var(--color-text)]">
						{(audit.bundleSize.html / 1024).toFixed(1)}KB
					</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-xs text-[var(--color-text-muted)]">CSS</span>
					<span class="text-xs font-mono text-[var(--color-text)]">
						{(audit.bundleSize.css / 1024).toFixed(1)}KB
					</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-xs text-[var(--color-text-muted)]">JS</span>
					<span class="text-xs font-mono text-[var(--color-text)]">
						{(audit.bundleSize.js / 1024).toFixed(1)}KB
					</span>
				</div>
				<div class="flex justify-between items-center pt-2 border-t border-[var(--color-border)]/50">
					<span class="text-xs text-[var(--color-text)]">Total</span>
					<span class="text-xs font-mono font-semibold {audit.bundleSize.total / 1024 > fullThresholds.maxBundleKb ? 'text-yellow-500' : 'text-[var(--color-text)]'}">
						{(audit.bundleSize.total / 1024).toFixed(1)}KB
					</span>
				</div>
			</div>

			<!-- Size bar -->
			<div class="mt-3">
				<div class="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
					<div
						class="h-full rounded-full transition-all {audit.bundleSize.total / 1024 > fullThresholds.maxBundleKb ? 'bg-yellow-500' : 'bg-green-500'}"
						style="width: {Math.min(100, (audit.bundleSize.total / 1024 / fullThresholds.maxBundleKb) * 100)}%"
					></div>
				</div>
				<div class="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
					<span>0</span>
					<span>{fullThresholds.maxBundleKb}KB limit</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Recommendations -->
	{#if audit?.recommendations && audit.recommendations.length > 0}
		<div class="p-4">
			<div class="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
				Recommendations ({audit.recommendations.length})
			</div>

			<div class="space-y-3 max-h-48 overflow-y-auto">
				{#each groupedRecs().warnings as rec}
					<div class="flex gap-2">
						<div class="flex-shrink-0 w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
							<span class="text-[10px] text-yellow-500">!</span>
						</div>
						<div>
							<div class="text-xs text-[var(--color-text)]">{rec.message}</div>
							<div class="text-[10px] text-[var(--color-text-muted)] mt-0.5">{rec.suggestion}</div>
						</div>
					</div>
				{/each}

				{#each groupedRecs().infos as rec}
					<div class="flex gap-2 opacity-70">
						<div class="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center">
							<span class="text-[10px] text-blue-500">i</span>
						</div>
						<div>
							<div class="text-xs text-[var(--color-text)]">{rec.message}</div>
							<div class="text-[10px] text-[var(--color-text-muted)] mt-0.5">{rec.suggestion}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else if audit}
		<div class="p-4 text-center">
			<div class="text-green-500 text-sm">
				✓ No performance issues detected
			</div>
		</div>
	{:else}
		<div class="p-4 text-center text-[var(--color-text-muted)] text-sm">
			Generate content to see performance metrics
		</div>
	{/if}
</div>

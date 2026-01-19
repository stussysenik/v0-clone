<script lang="ts">
	import type { StudioState, TelemetryEvent } from '@v0-clone/shared'

	interface Props {
		telemetry: TelemetryEvent[]
		metrics: {
			lastGenerationMs: number
			lastRenderMs: number
			totalRuns: number
		}
		state: StudioState
	}

	let { telemetry, metrics, state }: Props = $props()

	let expanded = $state(false)

	function formatTime(ms: number): string {
		if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`
		if (ms < 1000) return `${ms.toFixed(1)}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	function formatTimestamp(ts: number): string {
		const date = new Date(ts)
		return date.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
	}

	function getEventColor(type: TelemetryEvent['type']): string {
		switch (type) {
			case 'pipeline': return 'text-blue-400'
			case 'llm': return 'text-purple-400'
			case 'render': return 'text-green-400'
			case 'websocket': return 'text-yellow-400'
			case 'error': return 'text-red-400'
			default: return 'text-[var(--color-text-muted)]'
		}
	}
</script>

<div
	class="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-300 ease-out
		{expanded ? 'h-64' : 'h-10'}"
>
	<!-- Header -->
	<button
		onclick={() => expanded = !expanded}
		class="w-full h-10 px-4 flex items-center gap-4 text-xs font-mono hover:bg-[var(--color-bg-tertiary)] transition-colors"
	>
		<span class="text-[var(--color-text-muted)]">DEV_INFO</span>

		<!-- Quick stats -->
		<div class="flex items-center gap-4">
			<span class="text-green-400">
				Gen: {formatTime(metrics.lastGenerationMs)}
			</span>
			<span class="text-blue-400">
				Render: {formatTime(metrics.lastRenderMs)}
			</span>
			<span class="text-[var(--color-text-muted)]">
				Runs: {metrics.totalRuns}
			</span>
		</div>

		<!-- State indicator -->
		<span class="px-2 py-0.5 rounded text-xs
			{state === 'idle' ? 'bg-green-500/20 text-green-400' :
			 state === 'generating' ? 'bg-yellow-500/20 text-yellow-400' :
			 state === 'error' ? 'bg-red-500/20 text-red-400' :
			 'bg-blue-500/20 text-blue-400'}"
		>
			{state.toUpperCase()}
		</span>

		<div class="flex-1"></div>

		<!-- Expand icon -->
		<svg
			class="w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200
				{expanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Expanded content -->
	{#if expanded}
		<div class="h-[calc(100%-2.5rem)] overflow-hidden flex animate-fade-in">
			<!-- Telemetry log -->
			<div class="flex-1 overflow-y-auto p-4 font-mono text-xs">
				{#each telemetry.slice().reverse() as event}
					<div class="flex gap-3 py-1 hover:bg-[var(--color-bg-tertiary)] px-2 -mx-2 rounded">
						<span class="text-[var(--color-text-muted)] opacity-50 w-24 shrink-0">
							{formatTimestamp(event.timestamp)}
						</span>
						<span class="w-16 shrink-0 {getEventColor(event.type)}">
							[{event.type.toUpperCase()}]
						</span>
						<span class="text-[var(--color-text)] truncate">
							{JSON.stringify(event.data)}
						</span>
						{#if event.durationMs}
							<span class="text-green-400 shrink-0">
								{formatTime(event.durationMs)}
							</span>
						{/if}
					</div>
				{:else}
					<div class="text-[var(--color-text-muted)] text-center py-8">
						No telemetry events yet
					</div>
				{/each}
			</div>

			<!-- Metrics panel -->
			<div class="w-64 border-l border-[var(--color-border)] p-4 overflow-y-auto">
				<h3 class="text-xs font-semibold text-[var(--color-text-muted)] mb-3">METRICS</h3>

				<div class="space-y-3">
					<div>
						<div class="text-xs text-[var(--color-text-muted)]">Last Generation</div>
						<div class="text-lg font-mono text-green-400">{formatTime(metrics.lastGenerationMs)}</div>
					</div>

					<div>
						<div class="text-xs text-[var(--color-text-muted)]">Last Render</div>
						<div class="text-lg font-mono text-blue-400">{formatTime(metrics.lastRenderMs)}</div>
					</div>

					<div>
						<div class="text-xs text-[var(--color-text-muted)]">Total Runs</div>
						<div class="text-lg font-mono">{metrics.totalRuns}</div>
					</div>

					<div>
						<div class="text-xs text-[var(--color-text-muted)]">Events Logged</div>
						<div class="text-lg font-mono">{telemetry.length}</div>
					</div>
				</div>

				<div class="mt-6 pt-4 border-t border-[var(--color-border)]">
					<h3 class="text-xs font-semibold text-[var(--color-text-muted)] mb-2">PROVIDER</h3>
					<div class="text-sm font-mono text-purple-400">Claude (default)</div>
					<div class="text-xs text-[var(--color-text-muted)] mt-1">Hot-swap ready</div>
				</div>
			</div>
		</div>
	{/if}
</div>

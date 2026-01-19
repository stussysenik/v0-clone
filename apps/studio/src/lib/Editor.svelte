<script lang="ts">
	interface Props {
		content: string
		onUpdate: (content: string) => void
		onSubmit: (prompt: string) => void
	}

	let { content, onUpdate, onSubmit }: Props = $props()

	let promptInput = $state('')
	let mode = $state<'prompt' | 'code'>('prompt')

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault()
			if (mode === 'prompt' && promptInput.trim()) {
				onSubmit(promptInput.trim())
			}
		}
	}

	function handleSubmit() {
		if (promptInput.trim()) {
			onSubmit(promptInput.trim())
		}
	}
</script>

<div class="h-full flex flex-col bg-[var(--color-bg)]">
	<!-- Mode tabs -->
	<div class="flex border-b border-[var(--color-border)]">
		<button
			onclick={() => mode = 'prompt'}
			class="px-4 py-2 text-sm transition-all-smooth border-b-2
				{mode === 'prompt' ? 'border-[var(--color-accent)] text-[var(--color-text)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
		>
			Prompt
		</button>
		<button
			onclick={() => mode = 'code'}
			class="px-4 py-2 text-sm transition-all-smooth border-b-2
				{mode === 'code' ? 'border-[var(--color-accent)] text-[var(--color-text)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
		>
			Code
		</button>
	</div>

	<!-- Content area -->
	<div class="flex-1 overflow-hidden">
		{#if mode === 'prompt'}
			<!-- Prompt input mode -->
			<div class="h-full flex flex-col p-4">
				<div class="flex-1 relative">
					<textarea
						bind:value={promptInput}
						onkeydown={handleKeyDown}
						placeholder="Describe the UI you want to create...

Example prompts:
- A modern pricing card with hover effects
- A dashboard sidebar with navigation
- A hero section with gradient background"
						class="w-full h-full resize-none bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)]/50 focus:outline-none font-mono text-sm leading-relaxed"
					></textarea>
				</div>

				<div class="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
					<span class="text-xs text-[var(--color-text-muted)]">
						Press <kbd class="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text)] mx-0.5">⌘</kbd>+<kbd class="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] rounded text-[var(--color-text)] mx-0.5">Enter</kbd> to generate
					</span>

					<button
						onclick={handleSubmit}
						disabled={!promptInput.trim()}
						class="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-all-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						<span>Generate</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</button>
				</div>
			</div>
		{:else}
			<!-- Code view mode -->
			<div class="h-full overflow-auto">
				<div class="p-4">
					{#if content}
						<pre class="font-mono text-sm text-[var(--color-text)] whitespace-pre-wrap"><code>{content}</code></pre>
					{:else}
						<div class="text-center py-12 text-[var(--color-text-muted)]">
							<svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
							</svg>
							<p>No generated code yet</p>
							<p class="text-sm mt-1">Enter a prompt or load a file to generate code</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<script lang="ts">
	interface Props {
		onSubmit: (prompt: string) => void
	}

	let { onSubmit }: Props = $props()

	let prompt = $state('')

	const examples = [
		'A pricing card with 3 tiers',
		'A dashboard with charts and metrics',
		'A contact form with validation',
	]

	function handleExampleClick(example: string) {
		prompt = example
	}

	function handleSubmit() {
		if (prompt.trim()) {
			onSubmit(prompt)
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			handleSubmit()
		}
	}
</script>

<div class="welcome-container h-full flex flex-col items-center justify-center p-8 bg-[var(--color-bg)]">
	<!-- Hero Section -->
	<div class="text-center mb-8 animate-fade-in">
		<div
			class="gradient-logo w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg"
		>
			<span class="text-white font-bold text-3xl">v0</span>
		</div>
		<h1 class="text-4xl font-bold mb-3 text-[var(--color-text)]">
			Generate UI components with AI
		</h1>
		<p class="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto">
			Describe what you want to build, and watch it come to life
		</p>
	</div>

	<!-- Quick Start -->
	<div class="prompt-box-large w-full max-w-2xl mb-6 animate-slide-up">
		<div class="relative">
			<textarea
				bind:value={prompt}
				onkeydown={handleKeydown}
				placeholder="Describe your UI component..."
				class="w-full h-32 p-4 pr-32 rounded-lg border-2 border-[var(--color-border)]
					focus:border-[var(--color-accent)] focus:outline-none resize-none
					bg-[var(--color-bg-secondary)] text-[var(--color-text)]
					placeholder:text-[var(--color-text-muted)]
					transition-all-smooth"
			></textarea>
			<button
				onclick={handleSubmit}
				disabled={!prompt.trim()}
				class="absolute bottom-4 right-4 px-6 py-2 bg-[var(--color-accent)]
					hover:bg-[var(--color-accent-hover)] text-white rounded-md
					disabled:opacity-50 disabled:cursor-not-allowed
					transition-all-smooth font-medium shadow-md"
			>
				Generate ⌘↵
			</button>
		</div>
	</div>

	<!-- Example Prompts -->
	<div class="examples-grid w-full max-w-2xl mb-8 animate-slide-up" style="animation-delay: 100ms">
		<p class="text-sm text-[var(--color-text-muted)] mb-3">Try an example:</p>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
			{#each examples as example}
				<button
					onclick={() => handleExampleClick(example)}
					class="example-card p-4 text-left rounded-lg border border-[var(--color-border)]
						hover:border-[var(--color-accent)] hover:shadow-md
						bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]
						transition-all-smooth"
				>
					<span class="text-sm">{example}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Features Highlight -->
	<div class="features flex gap-8 text-sm text-[var(--color-text-muted)] animate-fade-in" style="animation-delay: 200ms">
		<div class="flex items-center gap-2">
			<span>⚡</span>
			<span>Instant Preview</span>
		</div>
		<div class="flex items-center gap-2">
			<span>🎨</span>
			<span>Tailwind CSS</span>
		</div>
		<div class="flex items-center gap-2">
			<span>⚛️</span>
			<span>Svelte 5</span>
		</div>
	</div>
</div>

<style>
	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.animate-slide-up {
		animation: slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
		animation-fill-mode: both;
	}

	.animate-fade-in {
		animation: fade-in 0.5s ease-out;
		animation-fill-mode: both;
	}
</style>

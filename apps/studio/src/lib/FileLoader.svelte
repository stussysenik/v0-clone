<script lang="ts">
	import type { StudioFile } from '@v0-clone/shared'

	interface Props {
		onFileLoaded: (file: StudioFile) => void
	}

	let { onFileLoaded }: Props = $props()

	let isDragging = $state(false)
	let inputRef: HTMLInputElement

	function getFileType(name: string): StudioFile['type'] {
		const ext = name.split('.').pop()?.toLowerCase()
		switch (ext) {
			case 'md':
			case 'markdown':
				return 'markdown'
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'webp':
			case 'svg':
				return 'image'
			case 'json':
				return 'json'
			default:
				return 'unknown'
		}
	}

	async function handleFile(file: File) {
		const type = getFileType(file.name)

		let content: string | ArrayBuffer

		if (type === 'image') {
			content = await file.arrayBuffer()
		} else {
			content = await file.text()
		}

		onFileLoaded({
			name: file.name,
			path: file.name, // No real path in browser
			type,
			content,
			lastModified: file.lastModified,
		})
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		isDragging = true
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault()
		isDragging = false
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault()
		isDragging = false

		const files = e.dataTransfer?.files
		if (files && files.length > 0) {
			await handleFile(files[0])
		}
	}

	async function handleInputChange(e: Event) {
		const input = e.target as HTMLInputElement
		const files = input.files
		if (files && files.length > 0) {
			await handleFile(files[0])
		}
	}

	function triggerFileInput() {
		inputRef?.click()
	}
</script>

<div
	class="p-4 border-b border-[var(--color-border)] transition-all-smooth
		{isDragging ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]' : ''}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="region"
>
	<div class="flex items-center gap-3">
		<button
			onclick={triggerFileInput}
			class="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] hover:border-[var(--color-text-muted)] transition-all-smooth group"
		>
			<svg class="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
			</svg>
			<span class="text-sm">Load File</span>
		</button>

		<span class="text-sm text-[var(--color-text-muted)]">
			or drag and drop
		</span>

		<div class="flex-1"></div>

		<span class="text-xs text-[var(--color-text-muted)] opacity-50">
			.md, .png, .jpg supported
		</span>
	</div>

	<input
		bind:this={inputRef}
		type="file"
		accept=".md,.markdown,.png,.jpg,.jpeg,.gif,.webp,.svg,.json"
		onchange={handleInputChange}
		class="hidden"
	/>
</div>

<!-- Drop zone overlay when dragging -->
{#if isDragging}
	<div
		class="fixed inset-0 bg-[var(--color-accent)]/10 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none animate-fade-in"
	>
		<div class="bg-[var(--color-bg-secondary)] border-2 border-dashed border-[var(--color-accent)] rounded-2xl p-12 animate-scale-in">
			<div class="text-center">
				<svg class="w-12 h-12 mx-auto mb-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
				</svg>
				<p class="text-lg font-medium">Drop your file here</p>
				<p class="text-sm text-[var(--color-text-muted)] mt-1">Release to load</p>
			</div>
		</div>
	</div>
{/if}

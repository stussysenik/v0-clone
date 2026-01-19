<script lang="ts">
	import { onMount } from 'svelte'

	interface Props {
		class?: string
	}

	let { class: className = '' }: Props = $props()

	let theme = $state<'light' | 'dark'>('light')

	// Toggle theme
	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light'
		applyTheme(theme)
	}

	// Apply theme to document
	function applyTheme(newTheme: 'light' | 'dark') {
		if (newTheme === 'dark') {
			document.documentElement.setAttribute('data-theme', 'dark')
		} else {
			document.documentElement.removeAttribute('data-theme')
		}
		localStorage.setItem('theme', newTheme)
	}

	onMount(() => {
		// Load theme from localStorage
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null

		// Check system preference
		const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

		// Use saved theme, or fall back to system preference
		theme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
		applyTheme(theme)

		// Listen for system theme changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = (e: MediaQueryListEvent) => {
			if (!localStorage.getItem('theme')) {
				theme = e.matches ? 'dark' : 'light'
				applyTheme(theme)
			}
		}
		mediaQuery.addEventListener('change', handleChange)

		return () => mediaQuery.removeEventListener('change', handleChange)
	})
</script>

<button
	onclick={toggleTheme}
	class="p-2 rounded-md transition-all-smooth hover:bg-[var(--color-bg-tertiary)] {className}"
	aria-label="Toggle theme"
	title="Toggle theme (⌘+D)"
>
	{#if theme === 'light'}
		<!-- Moon icon for light theme (click to go dark) -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-[var(--color-text-secondary)]"
		>
			<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
		</svg>
	{:else}
		<!-- Sun icon for dark theme (click to go light) -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="text-[var(--color-text-secondary)]"
		>
			<circle cx="12" cy="12" r="4"></circle>
			<path d="M12 2v2"></path>
			<path d="M12 20v2"></path>
			<path d="m4.93 4.93 1.41 1.41"></path>
			<path d="m17.66 17.66 1.41 1.41"></path>
			<path d="M2 12h2"></path>
			<path d="M20 12h2"></path>
			<path d="m6.34 17.66-1.41 1.41"></path>
			<path d="m19.07 4.93-1.41 1.41"></path>
		</svg>
	{/if}
</button>

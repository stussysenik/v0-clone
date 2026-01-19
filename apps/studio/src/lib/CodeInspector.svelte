<script lang="ts">
	import { onMount } from 'svelte'
	import type { Highlighter } from 'shiki'

	interface Props {
		code: string
		onCodeChange?: (newCode: string) => void
		language?: 'svelte' | 'tsx' | 'vue' | 'html'
	}

	type ExportFormat = 'svelte' | 'tsx' | 'vue' | 'html' | 'zip'

	let { code, onCodeChange, language = 'svelte' }: Props = $props()

	let copied = $state(false)
	let isEditing = $state(false)
	let editableCode = $state('')
	let highlightedHtml = $state<string>('')
	let highlighter = $state<Highlighter | null>(null)
	let isHighlighting = $state(false)
	let highlightDebounceTimer: ReturnType<typeof setTimeout> | null = null
	let showExportMenu = $state(false)
	let isExporting = $state(false)

	// Line numbers for display
	const lineCount = $derived(code ? code.split('\n').length : 0)

	// Sync code prop to editable state
	$effect(() => {
		editableCode = code
	})

	// Debounced highlighting for streaming
	$effect(() => {
		if (!code || !highlighter) {
			highlightedHtml = ''
			return
		}

		// Debounce highlighting during streaming (50ms delay)
		if (highlightDebounceTimer) {
			clearTimeout(highlightDebounceTimer)
		}

		highlightDebounceTimer = setTimeout(() => {
			highlightCode(code)
		}, 50)
	})

	async function highlightCode(codeToHighlight: string) {
		if (!highlighter || !codeToHighlight) return

		isHighlighting = true
		try {
			// Map language to Shiki language
			const lang = getShikiLanguage(language)

			const html = highlighter.codeToHtml(codeToHighlight, {
				lang,
				theme: 'github-dark-default',
			})

			highlightedHtml = html
		} catch (err) {
			console.warn('Highlighting failed:', err)
			// Fallback to plain text
			highlightedHtml = ''
		}
		isHighlighting = false
	}

	function getShikiLanguage(lang: string): string {
		const langMap: Record<string, string> = {
			svelte: 'svelte',
			tsx: 'tsx',
			vue: 'vue',
			html: 'html',
			react: 'tsx',
		}
		return langMap[lang] || 'html'
	}

	onMount(async () => {
		// Dynamically import Shiki for code splitting
		try {
			const { createHighlighter } = await import('shiki')

			highlighter = await createHighlighter({
				themes: ['github-dark-default', 'github-light-default'],
				langs: ['svelte', 'tsx', 'vue', 'html', 'css', 'javascript', 'typescript'],
			})

			// Initial highlight if code exists
			if (code) {
				await highlightCode(code)
			}
		} catch (err) {
			console.warn('Failed to load Shiki:', err)
		}
	})

	function handleCopy() {
		navigator.clipboard.writeText(editableCode)
		copied = true
		setTimeout(() => {
			copied = false
		}, 2000)
	}

	async function handleExport(format: ExportFormat) {
		showExportMenu = false
		isExporting = true

		try {
			if (format === 'zip') {
				await exportAsZip()
			} else {
				const convertedCode = convertCode(code, language, format)
				downloadFile(convertedCode, `component.${format}`, 'text/plain')
			}
		} catch (err) {
			console.error('Export failed:', err)
		}

		isExporting = false
	}

	function downloadFile(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	function convertCode(sourceCode: string, fromLang: string, toLang: ExportFormat): string {
		// For now, do basic conversions. More sophisticated conversions would need AST parsing.
		if (fromLang === toLang) return sourceCode

		// Convert Svelte to other formats
		if (fromLang === 'svelte') {
			if (toLang === 'html') {
				return convertSvelteToHtml(sourceCode)
			}
			if (toLang === 'tsx') {
				return convertSvelteToReact(sourceCode)
			}
			if (toLang === 'vue') {
				return convertSvelteToVue(sourceCode)
			}
		}

		// Default: return as-is with a comment
		return `/* Converted from ${fromLang} to ${toLang} */\n\n${sourceCode}`
	}

	// Helper to create regex patterns that avoid Svelte parsing issues
	const SCRIPT_END = '<' + '/script>'
	const STYLE_END = '<' + '/style>'

	function convertSvelteToHtml(svelteCode: string): string {
		// Extract template part (everything after script closing tag and before style)
		const templateMatch = svelteCode.match(new RegExp(SCRIPT_END + '\\s*([\\s\\S]*?)(?:<style>|$)'))
		const styleMatch = svelteCode.match(new RegExp('<style[^>]*>([\\s\\S]*?)' + STYLE_END))

		let template = templateMatch?.[1]?.trim() || svelteCode
		const styles = styleMatch?.[1]?.trim() || ''

		// Remove Svelte-specific syntax
		template = template
			.replace(/{#if\s+[^}]+}/g, '<!-- if -->')
			.replace(/{:else\s*if\s+[^}]+}/g, '<!-- else if -->')
			.replace(/{:else}/g, '<!-- else -->')
			.replace(/{\/if}/g, '<!-- /if -->')
			.replace(/{#each\s+[^}]+}/g, '<!-- each -->')
			.replace(/{\/each}/g, '<!-- /each -->')
			.replace(/{@html\s+[^}]+}/g, '')
			.replace(/{[^}]+}/g, '<!-- binding -->')
			.replace(/on:(\w+)=\{[^}]+\}/g, 'on$1=""')
			.replace(/bind:(\w+)=\{[^}]+\}/g, '')
			.replace(/\$state\([^)]*\)/g, '')

		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component</title>
  <script src="https://cdn.tailwindcss.com"><` + `/script>
  ${styles ? `<style>\n${styles}\n  <` + `/style>` : ''}
<` + `/head>
<body>
${template}
<` + `/body>
<` + `/html>`
	}

	function convertSvelteToReact(svelteCode: string): string {
		// Extract script and template
		const scriptMatch = svelteCode.match(new RegExp('<script[^>]*>([\\s\\S]*?)' + SCRIPT_END))
		const templateMatch = svelteCode.match(new RegExp(SCRIPT_END + '\\s*([\\s\\S]*?)(?:<style>|$)'))
		const styleMatch = svelteCode.match(new RegExp('<style[^>]*>([\\s\\S]*?)' + STYLE_END))

		const script = scriptMatch?.[1]?.trim() || ''
		let template = templateMatch?.[1]?.trim() || svelteCode
		const styles = styleMatch?.[1]?.trim() || ''

		// Convert template to JSX
		template = template
			.replace(/class=/g, 'className=')
			.replace(/{#if\s+([^}]+)}/g, '{$1 && (')
			.replace(/{:else\s*if\s+([^}]+)}/g, ') : $1 ? (')
			.replace(/{:else}/g, ') : (')
			.replace(/{\/if}/g, ')}')
			.replace(/{#each\s+(\w+)\s+as\s+(\w+)(?:,\s*(\w+))?\s*}/g, '{$1.map(($2, $3) => (')
			.replace(/{\/each}/g, '))}')
			.replace(/on:(\w+)=/g, 'on$1=')
			.replace(/onclick=/gi, 'onClick=')
			.replace(/onchange=/gi, 'onChange=')
			.replace(/oninput=/gi, 'onInput=')

		// Convert script to React hooks
		let reactScript = script
			.replace(/let\s+(\w+)\s*=\s*\$state\(([^)]*)\)/g, 'const [$1, set$1] = useState($2)')
			.replace(/const\s+(\w+)\s*=\s*\$derived\(([^)]*)\)/g, 'const $1 = useMemo(() => $2, [])')
			.replace(/interface\s+Props\s*{[\s\S]*?}/g, '')
			.replace(/let\s*{\s*([^}]+)\s*}\s*:\s*Props\s*=\s*\$props\(\)/g, '')

		return `import React, { useState, useMemo, useEffect } from 'react'

export default function Component() {
${reactScript ? `  ${reactScript.split('\n').join('\n  ')}` : ''}

  return (
    ${template.split('\n').join('\n    ')}
  )
}
${styles ? `\n// Styles (convert to CSS modules or styled-components)\n/*\n${styles}\n*/` : ''}`
	}

	function convertSvelteToVue(svelteCode: string): string {
		// Extract parts
		const scriptMatch = svelteCode.match(new RegExp('<script[^>]*>([\\s\\S]*?)' + SCRIPT_END))
		const templateMatch = svelteCode.match(new RegExp(SCRIPT_END + '\\s*([\\s\\S]*?)(?:<style>|$)'))
		const styleMatch = svelteCode.match(new RegExp('<style[^>]*>([\\s\\S]*?)' + STYLE_END))

		const script = scriptMatch?.[1]?.trim() || ''
		let template = templateMatch?.[1]?.trim() || svelteCode
		const styles = styleMatch?.[1]?.trim() || ''

		// Convert template to Vue
		template = template
			.replace(/{#if\s+([^}]+)}/g, '<template v-if="$1">')
			.replace(/{:else\s*if\s+([^}]+)}/g, '</template><template v-else-if="$1">')
			.replace(/{:else}/g, '</template><template v-else>')
			.replace(/{\/if}/g, '</template>')
			.replace(/{#each\s+(\w+)\s+as\s+(\w+)(?:,\s*(\w+))?\s*}/g, '<template v-for="($2, $3) in $1" :key="$3">')
			.replace(/{\/each}/g, '</template>')
			.replace(/onclick=/gi, '@click=')
			.replace(/oninput=/gi, '@input=')
			.replace(/onchange=/gi, '@change=')
			.replace(/{(\w+)}/g, '{{ $1 }}')

		// Convert script to Vue Composition API
		let vueScript = script
			.replace(/let\s+(\w+)\s*=\s*\$state\(([^)]*)\)/g, 'const $1 = ref($2)')
			.replace(/const\s+(\w+)\s*=\s*\$derived\(([^)]*)\)/g, 'const $1 = computed(() => $2)')

		return `<template>
  ${template}
<` + `/template>

<script setup lang="ts">
import { ref, computed } from 'vue'

${vueScript}
<` + `/script>

${styles ? `<style scoped>\n${styles}\n<` + `/style>` : ''}`
	}

	async function exportAsZip() {
		// Create a simple ZIP file structure
		// Note: In production, you'd want to use a library like JSZip
		const files: Record<string, string> = {
			'package.json': JSON.stringify({
				name: 'exported-component',
				version: '1.0.0',
				type: 'module',
				scripts: {
					dev: language === 'svelte' ? 'vite dev' : language === 'tsx' ? 'vite' : 'vite',
					build: 'vite build',
				},
				dependencies: getFrameworkDependencies(language),
				devDependencies: getDevDependencies(language),
			}, null, 2),
			'README.md': `# Exported Component

Generated by v0-clone Studio.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
			[`src/Component.${language}`]: code,
			'vite.config.js': getViteConfig(language),
		}

		// For now, download as a simple JSON manifest
		// In production, use JSZip or similar
		const manifest = {
			files,
			instructions: 'Extract and run: npm install && npm run dev',
		}

		downloadFile(
			JSON.stringify(manifest, null, 2),
			'component-project.json',
			'application/json'
		)
	}

	function getFrameworkDependencies(lang: string): Record<string, string> {
		switch (lang) {
			case 'svelte':
				return { svelte: '^5.0.0' }
			case 'tsx':
				return { react: '^18.0.0', 'react-dom': '^18.0.0' }
			case 'vue':
				return { vue: '^3.0.0' }
			default:
				return {}
		}
	}

	function getDevDependencies(lang: string): Record<string, string> {
		const base = {
			vite: '^5.0.0',
			tailwindcss: '^4.0.0',
			typescript: '^5.0.0',
		}
		switch (lang) {
			case 'svelte':
				return { ...base, '@sveltejs/vite-plugin-svelte': '^4.0.0' }
			case 'tsx':
				return { ...base, '@vitejs/plugin-react': '^4.0.0' }
			case 'vue':
				return { ...base, '@vitejs/plugin-vue': '^5.0.0' }
			default:
				return base
		}
	}

	function getViteConfig(lang: string): string {
		switch (lang) {
			case 'svelte':
				return `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
})`
			case 'tsx':
				return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`
			case 'vue':
				return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`
			default:
				return `import { defineConfig } from 'vite'

export default defineConfig({})`
		}
	}

	function handleEditToggle() {
		if (isEditing && onCodeChange) {
			onCodeChange(editableCode)
		}
		isEditing = !isEditing
	}
</script>

<div class="h-full flex flex-col bg-[var(--color-bg)]">
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
		<div class="flex items-center gap-2">
			<h2 class="text-sm font-semibold text-[var(--color-text)]">Code</h2>
			{#if code}
				<span class="px-1.5 py-0.5 text-[10px] rounded bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] uppercase">
					{language}
				</span>
				<span class="text-[10px] text-[var(--color-text-muted)]">
					{lineCount} lines
				</span>
			{/if}
		</div>

		{#if code}
			<div class="flex items-center gap-2">
				<!-- Edit toggle -->
				<button
					onclick={handleEditToggle}
					class="px-3 py-1.5 text-xs rounded-md transition-all-smooth
						{isEditing ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
					title={isEditing ? 'Save changes' : 'Edit code'}
				>
					{isEditing ? 'Save' : 'Edit'}
				</button>

				<!-- Copy button -->
				<button
					onclick={handleCopy}
					class="px-3 py-1.5 text-xs rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-all-smooth flex items-center gap-1.5"
					title="Copy to clipboard"
				>
					{#if copied}
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						<span>Copied!</span>
					{:else}
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
						<span>Copy</span>
					{/if}
				</button>

				<!-- Export button with dropdown -->
				<div class="relative">
					<button
						onclick={() => showExportMenu = !showExportMenu}
						class="px-3 py-1.5 text-xs rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-all-smooth flex items-center gap-1.5"
						title="Export code"
						disabled={isExporting}
					>
						{#if isExporting}
							<div class="w-3.5 h-3.5 border border-current/30 border-t-current rounded-full animate-spin"></div>
						{:else}
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
							</svg>
						{/if}
						<span>Export</span>
						<svg class="w-3 h-3 transition-transform {showExportMenu ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					<!-- Export dropdown menu -->
					{#if showExportMenu}
						<div
							class="absolute right-0 top-full mt-1 w-48 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-lg z-10 animate-fade-in"
						>
							<div class="px-3 py-1.5 text-[10px] uppercase text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
								Export as file
							</div>
							<button
								onclick={() => handleExport('svelte')}
								class="w-full px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 transition-colors"
							>
								<span class="w-4 h-4 rounded bg-orange-500/20 text-[8px] flex items-center justify-center text-orange-400">SV</span>
								Svelte (.svelte)
							</button>
							<button
								onclick={() => handleExport('tsx')}
								class="w-full px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 transition-colors"
							>
								<span class="w-4 h-4 rounded bg-blue-500/20 text-[8px] flex items-center justify-center text-blue-400">TS</span>
								React (.tsx)
							</button>
							<button
								onclick={() => handleExport('vue')}
								class="w-full px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 transition-colors"
							>
								<span class="w-4 h-4 rounded bg-green-500/20 text-[8px] flex items-center justify-center text-green-400">VU</span>
								Vue (.vue)
							</button>
							<button
								onclick={() => handleExport('html')}
								class="w-full px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 transition-colors"
							>
								<span class="w-4 h-4 rounded bg-red-500/20 text-[8px] flex items-center justify-center text-red-400">HT</span>
								HTML (.html)
							</button>

							<div class="px-3 py-1.5 text-[10px] uppercase text-[var(--color-text-muted)] border-y border-[var(--color-border)] mt-1">
								Export as project
							</div>
							<button
								onclick={() => handleExport('zip')}
								class="w-full px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 transition-colors"
							>
								<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
								Project with deps
							</button>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Code Content -->
	<div class="flex-1 overflow-auto scroll-smooth">
		{#if code}
			<div class="animate-fade-in-scale">
				{#if isEditing}
					<!-- Editable textarea with line numbers -->
					<div class="flex">
						<!-- Line numbers -->
						<div class="select-none py-4 px-2 text-right text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] font-mono">
							{#each Array(editableCode.split('\n').length) as _, i}
								<div class="leading-6">{i + 1}</div>
							{/each}
						</div>
						<!-- Editable code -->
						<textarea
							bind:value={editableCode}
							class="flex-1 w-full min-h-[500px] resize-none bg-transparent text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none font-mono text-sm leading-6 p-4"
							spellcheck="false"
						></textarea>
					</div>
				{:else}
					<!-- Read-only highlighted code -->
					<div class="flex">
						<!-- Line numbers -->
						<div class="select-none py-4 px-2 text-right text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] font-mono sticky left-0">
							{#each Array(lineCount) as _, i}
								<div class="leading-6">{i + 1}</div>
							{/each}
						</div>
						<!-- Highlighted code -->
						<div class="flex-1 overflow-x-auto">
							{#if highlightedHtml}
								<div
									class="shiki-container p-4 text-sm [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:leading-6"
								>
									{@html highlightedHtml}
								</div>
							{:else}
								<!-- Fallback to plain text while loading or if highlighting fails -->
								<pre class="font-mono text-sm text-[var(--color-text)] whitespace-pre p-4 leading-6"><code>{code}</code></pre>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Empty state -->
			<div class="text-center py-12 text-[var(--color-text-muted)] animate-fade-in">
				<svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
				</svg>
				<p>No generated code yet</p>
				<p class="text-sm mt-1">Enter a prompt to generate code</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Shiki theme overrides for dark mode */
	:global(.shiki-container .shiki) {
		background-color: transparent !important;
	}

	:global(.shiki-container pre) {
		overflow-x: auto;
	}

	:global(.shiki-container code) {
		display: block;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	}

	/* Line height alignment */
	:global(.shiki-container .line) {
		line-height: 1.5rem;
		min-height: 1.5rem;
	}
</style>

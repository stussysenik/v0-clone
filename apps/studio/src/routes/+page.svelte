<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import ChatPanel, { type Message } from '$lib/ChatPanel.svelte'
	import Canvas from '$lib/Canvas.svelte'
	import CodeInspector from '$lib/CodeInspector.svelte'
	import DevInfo from '$lib/DevInfo.svelte'
	import StatusBar from '$lib/StatusBar.svelte'
	import ChroniclePanel from '$lib/ChroniclePanel.svelte'
	import FigmaImporter from '$lib/FigmaImporter.svelte'
	import SessionList from '$lib/SessionList.svelte'
	import SettingsPanel from '$lib/SettingsPanel.svelte'
	import StyleInspector from '$lib/overlays/StyleInspector.svelte'
	import ContextMenu, { type ContextMenuAction } from '$lib/overlays/ContextMenu.svelte'
	import type { SelectedElement } from '$lib/overlays/ElementSelector.svelte'
	import { Dialog, ThemeToggle } from '$lib/ui'
	import type { StudioState, StudioFile, TelemetryEvent, PipelineOutput, ChronicleArtifact, FigmaDesignTokens, FigmaImportResult, ConversationSession, StudioSettings } from '@v0-clone/shared'
	import { addOidAttributes, applyStyleUpdate, applyTailwindUpdate, cssToTailwind } from '$lib/utils/code-sync'
	import {
		chronicleDB,
		pb,
		initPocketBase,
		startAutoSync,
		stopAutoSync,
		getConnectionState,
		subscribeToConnectionState,
		updateStreamingCheckpoint,
		finalizeStreamingCheckpoint,
		resetStreamingCheckpoint,
		debounce,
		type ConnectionState,
	} from '@v0-clone/shared'

	// State
	let state = $state<StudioState>('idle')
	let currentFile = $state<StudioFile | null>(null)
	let generatedCode = $state<string>('')
	let previewHtml = $state<string>('')
	let telemetry = $state<TelemetryEvent[]>([])
	let showDevInfo = $state(true) // DEV_INFO flag
	let showChronicle = $state(false) // Chronicle panel toggle
	let showFigma = $state(false) // Figma integration toggle
	let showSessions = $state(false) // Session list toggle
	let showSettings = $state(false) // Model settings panel toggle
	let error = $state<string | null>(null)
	let currentStage = $state<'parse' | 'generate' | 'render' | null>(null)
	let chatHistory = $state<Message[]>([])
	let currentPrompt = $state<string>('') // Track current prompt for chronicle

	// Session state
	let currentSessionId = $state<string | null>(null)

	// Component refs
	let chatPanelRef: ReturnType<typeof ChatPanel> | null = $state(null)

	// Figma integration state
	let figmaTokens = $state<FigmaDesignTokens | null>(null)

	// Visual editing state
	let selectedElement = $state<SelectedElement | null>(null)
	let showStyleInspector = $derived(selectedElement !== null)
	let contextMenuPosition = $state<{ x: number; y: number } | null>(null)

	// PocketBase state
	let currentConversationId = $state<string | null>(null)
	let currentGenerationId = $state<string | null>(null)
	let connectionState = $state<ConnectionState>(getConnectionState())
	let unsubscribeConnection: (() => void) | null = null

	// Auto-save state
	let lastSavedCode = $state<string>('')
	let isSaving = $state(false)

	// Preview-centric layout (65% preview, 35% chat+code)
	let leftPanelWidth = $state(20) // Chat panel percentage (reduced for preview focus)
	let rightPanelWidth = $state(20) // Code inspector percentage (reduced for preview focus)
	let chroniclePanelWidth = $state(15) // Chronicle panel percentage (when visible)
	let sessionsPanelWidth = $state(15) // Sessions panel percentage (when visible)

	// Computed state for dialog
	let showErrorDialog = $derived(error !== null)

	// Handle panel resize
	let isDraggingLeft = $state(false)
	let isDraggingRight = $state(false)

	function handleLeftMouseDown() {
		isDraggingLeft = true
	}

	function handleRightMouseDown() {
		isDraggingRight = true
	}

	function handleMouseMove(e: MouseEvent) {
		const container = document.querySelector('main')
		if (!container) return

		const rect = container.getBoundingClientRect()
		const percentage = ((e.clientX - rect.left) / rect.width) * 100

		if (isDraggingLeft) {
			leftPanelWidth = Math.max(15, Math.min(40, percentage))
		} else if (isDraggingRight) {
			const rightPercentage = 100 - percentage
			rightPanelWidth = Math.max(15, Math.min(40, rightPercentage))
		}
	}

	function handleMouseUp() {
		isDraggingLeft = false
		isDraggingRight = false
	}

	// Pipeline metrics
	let metrics = $state({
		lastGenerationMs: 0,
		lastRenderMs: 0,
		totalRuns: 0,
	})

	// Provider info
	let providerInfo = $state<{ provider: string; model: string; isLocal: boolean } | undefined>()

	// Handle chat submit
	function handleChatSubmit(prompt: string) {
		currentPrompt = prompt
		generateFromContent(prompt)
	}

	// Handle conversation change from ChatPanel
	function handleConversationChange(conversationId: string | null) {
		currentConversationId = conversationId
	}

	// Handle session change from ChatPanel
	function handleSessionChange(sessionId: string | null) {
		currentSessionId = sessionId
	}

	// Handle session selection from SessionList
	async function handleSessionSelect(session: ConversationSession) {
		if (chatPanelRef) {
			const restored = await chatPanelRef.restoreSession(session.id)
			if (restored) {
				currentSessionId = session.id
				// If session has generations, restore the last one
				if (session.generations.length > 0 && session.metadata?.lastGeneratedCode) {
					generatedCode = session.metadata.lastGeneratedCode
					await regeneratePreview(generatedCode)
				}
				showSessions = false // Close panel after selection
				addTelemetry('pipeline', { event: 'session_restored', sessionId: session.id })
			}
		}
	}

	// Handle new session request
	async function handleNewSession() {
		if (chatPanelRef) {
			await chatPanelRef.startNewSession()
			currentSessionId = null
			generatedCode = ''
			previewHtml = ''
			showSessions = false
			addTelemetry('pipeline', { event: 'new_session_started' })
		}
	}

	// Handle settings change
	async function handleSettingsChange(settings: StudioSettings) {
		addTelemetry('pipeline', {
			event: 'settings_changed',
			provider: settings.provider,
			model: settings.model,
		})

		// Reload provider info after settings change
		try {
			const res = await fetch('/api/provider', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			})
			if (res.ok) {
				providerInfo = await res.json()
				addTelemetry('llm', { event: 'provider_updated', provider: providerInfo?.provider, model: providerInfo?.model })
			}
		} catch (err) {
			console.warn('Failed to update provider:', err)
		}
	}

	// Handle Figma import
	function handleFigmaImport(result: FigmaImportResult) {
		if (result.success && result.tokens) {
			figmaTokens = result.tokens
			addTelemetry('pipeline', {
				event: 'figma_tokens_imported',
				fileName: result.tokens.source.fileName,
				colorCount: Object.keys(result.tokens.colors.primary).length +
					Object.keys(result.tokens.colors.secondary).length +
					Object.keys(result.tokens.colors.custom).length,
				fontCount: result.tokens.typography.fontFamilies.length,
			})
		}
	}

	// Handle Figma clear
	function handleFigmaClear() {
		figmaTokens = null
		addTelemetry('pipeline', { event: 'figma_tokens_cleared' })
	}

	// Handle element selection from Canvas
	function handleElementSelect(element: SelectedElement | null) {
		selectedElement = element
		if (element) {
			addTelemetry('visual_edit', {
				event: 'element_selected',
				tagName: element.tagName,
				path: element.path.join(' > '),
			})
		}
	}

	// Handle style change from StyleInspector (two-way sync)
	function handleStyleChange(property: string, value: string) {
		if (!selectedElement?.dataOid) {
			// If element doesn't have an OID, we can only update via inline style in iframe
			console.warn('Element has no OID, cannot sync to code')
			updateIframeElementStyle(property, value)
			return
		}

		const oid = selectedElement.dataOid

		// Try to convert to Tailwind classes first
		const tailwindClasses = cssToTailwind(property, value)

		let newCode: string
		if (tailwindClasses.length > 0) {
			// Apply as Tailwind classes
			newCode = applyTailwindUpdate(generatedCode, oid, tailwindClasses, [])
		} else {
			// Apply as inline style
			newCode = applyStyleUpdate(generatedCode, { property, value }, oid)
		}

		// Update the code
		generatedCode = newCode

		// Trigger re-render
		regeneratePreview(newCode)

		// Log telemetry
		addTelemetry('visual_edit', {
			event: 'style_changed',
			property,
			value,
			element: selectedElement.tagName,
			oid,
			usedTailwind: tailwindClasses.length > 0,
		})
	}

	// Update element style directly in iframe (for elements without OID)
	function updateIframeElementStyle(property: string, value: string) {
		if (!selectedElement) return

		// Send message to iframe to update the style
		const iframe = document.querySelector('iframe')
		if (iframe?.contentWindow) {
			iframe.contentWindow.postMessage({
				type: 'updateElementStyle',
				payload: {
					selector: selectedElement.path[selectedElement.path.length - 1],
					property,
					value,
				},
			}, '*')
		}
	}

	// Regenerate preview from updated code
	async function regeneratePreview(code: string) {
		try {
			const response = await fetch('/api/render', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, language: 'svelte' }),
			})

			if (response.ok) {
				const result = await response.json()
				previewHtml = result.html
			}
		} catch (err) {
			// Fallback: try to re-render using the existing pipeline
			console.warn('Failed to regenerate preview:', err)
		}
	}

	// Handle style inspector close
	function handleStyleInspectorClose() {
		selectedElement = null
	}

	// Handle context menu open (right-click on canvas)
	function handleContextMenu(e: MouseEvent) {
		if (selectedElement) {
			e.preventDefault()
			contextMenuPosition = { x: e.clientX, y: e.clientY }
		}
	}

	// Handle context menu close
	function handleContextMenuClose() {
		contextMenuPosition = null
	}

	// Handle context menu action
	function handleContextMenuAction(action: ContextMenuAction) {
		addTelemetry('visual_edit', {
			event: 'context_menu_action',
			actionType: action.type,
			element: selectedElement?.tagName,
		})

		switch (action.type) {
			case 'ask-ai':
				// Generate modification prompt and send to chat
				if (action.prompt && selectedElement) {
					const fullPrompt = `Modify the ${selectedElement.tagName} element (${selectedElement.path.join(' > ')}): ${action.prompt}`
					handleChatSubmit(fullPrompt)
				}
				break

			case 'edit-code':
				// Focus on the code in CodeInspector (scroll to the element's code)
				// For now, just log - full implementation would scroll to the element's position
				console.log('Edit in code:', selectedElement?.dataOid)
				break

			case 'duplicate':
				// Duplicate the selected element in code
				if (selectedElement?.dataOid) {
					const code = duplicateElement(generatedCode, selectedElement.dataOid)
					if (code !== generatedCode) {
						generatedCode = code
						regeneratePreview(code)
					}
				}
				break

			case 'delete':
				// Delete the selected element from code
				if (selectedElement?.dataOid) {
					const code = deleteElement(generatedCode, selectedElement.dataOid)
					if (code !== generatedCode) {
						generatedCode = code
						regeneratePreview(code)
						selectedElement = null
					}
				}
				break

			case 'copy-styles':
				// Copy computed styles to clipboard
				if (selectedElement?.computedStyles) {
					const styles = Object.entries(selectedElement.computedStyles)
						.filter(([_, v]) => v)
						.map(([k, v]) => `${k}: ${v};`)
						.join('\n')
					navigator.clipboard.writeText(styles)
				}
				break

			case 'inspect':
				// Open browser dev tools (can't do programmatically, just show style inspector)
				break

			case 'wrap':
				// Wrap element in a container
				if (selectedElement?.dataOid) {
					const code = wrapElement(generatedCode, selectedElement.dataOid, action.wrapper)
					if (code !== generatedCode) {
						generatedCode = code
						regeneratePreview(code)
					}
				}
				break
		}

		contextMenuPosition = null
	}

	// Helper: Duplicate element in code
	function duplicateElement(code: string, oid: string): string {
		// Find the element by OID and duplicate it
		const oidRegex = new RegExp(`(<[^>]*data-oid="${oid}"[^>]*>[\\s\\S]*?<\\/[^>]+>)`, 'i')
		const match = code.match(oidRegex)
		if (match) {
			// Generate new OID for the duplicate
			const newOid = `e${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`
			const duplicate = match[1].replace(`data-oid="${oid}"`, `data-oid="${newOid}"`)
			return code.replace(match[1], match[1] + '\n' + duplicate)
		}
		return code
	}

	// Helper: Delete element from code
	function deleteElement(code: string, oid: string): string {
		// Find and remove the element by OID
		const oidRegex = new RegExp(`\\s*<[^>]*data-oid="${oid}"[^>]*>[\\s\\S]*?<\\/[^>]+>\\s*`, 'i')
		return code.replace(oidRegex, '\n')
	}

	// Helper: Wrap element in container
	function wrapElement(code: string, oid: string, wrapper: string): string {
		const oidRegex = new RegExp(`(<[^>]*data-oid="${oid}"[^>]*>[\\s\\S]*?<\\/[^>]+>)`, 'i')
		const match = code.match(oidRegex)
		if (match) {
			const wrapperOid = `e${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`
			const wrapperClass = wrapper === 'flex' ? 'class="flex"' : ''
			const wrapped = `<div data-oid="${wrapperOid}" ${wrapperClass}>\n  ${match[1]}\n</div>`
			return code.replace(match[1], wrapped)
		}
		return code
	}

	// Handle artifact selection from chronicle
	function handleArtifactSelect(artifact: ChronicleArtifact) {
		if (artifact.type === 'generation') {
			generatedCode = artifact.generatedCode ?? ''
			previewHtml = artifact.renderedHtml ?? ''
			currentPrompt = artifact.prompt
			addTelemetry('pipeline', { event: 'artifact_restored', artifactId: artifact.id })
		}
	}

	// Save generation to chronicle (IndexedDB - local backup)
	async function saveToChronicle(prompt: string, code: string, html: string, metadata: Record<string, unknown>) {
		try {
			await chronicleDB.addGeneration(prompt, code, html, metadata)
			addTelemetry('pipeline', { event: 'saved_to_chronicle' })
		} catch (e) {
			console.warn('Failed to save to chronicle:', e)
		}
	}

	// Debounced save function for code edits
	const debouncedSaveCode = debounce(async (code: string) => {
		if (!connectionState.isConnected || !currentGenerationId || code === lastSavedCode) {
			return
		}

		isSaving = true
		try {
			// Update the generation with new code
			await pb.generations.updateGeneration(currentGenerationId, { code })
			lastSavedCode = code
			addTelemetry('pipeline', { event: 'code_autosaved' })
		} catch (e) {
			console.warn('Failed to auto-save code:', e)
		}
		isSaving = false
	}, 1000) // 1 second debounce

	// Handle code change from CodeInspector
	function handleCodeChange(newCode: string) {
		generatedCode = newCode

		// Trigger debounced auto-save
		debouncedSaveCode(newCode)

		// Re-render the preview with updated code
		// TODO: Implement re-rendering logic in Phase 10
	}

	// Generate from content using LLM pipeline
	async function generateFromContent(content: string) {
		state = 'generating'
		error = null
		generatedCode = ''
		currentStage = null
		currentGenerationId = null

		const startTime = performance.now()
		addTelemetry('pipeline', { event: 'generation_started' })

		// Reset streaming checkpoint state
		resetStreamingCheckpoint()

		// Create initial generation record (with empty code) to get ID for checkpoints
		let generationRecord: { id: string } | null = null
		if (connectionState.isConnected) {
			try {
				generationRecord = await pb.generations.createGeneration({
					prompt: content,
					code: '',
					html: '',
					conversation: currentConversationId ?? undefined,
					metadata: {
						provider: providerInfo?.provider ?? 'unknown',
						model: providerInfo?.model ?? 'unknown',
						hasFigmaTokens: !!figmaTokens,
						figmaFile: figmaTokens?.source.fileName,
					},
				})
				currentGenerationId = generationRecord.id
				addTelemetry('pipeline', { event: 'generation_record_created', id: generationRecord.id })
			} catch (e) {
				console.warn('Failed to create generation record:', e)
			}
		}

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt: content,
					stream: true,
					figmaTokens: figmaTokens, // Pass Figma design tokens if available
				}),
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.error || `HTTP ${response.status}`)
			}

			const reader = response.body?.getReader()
			if (!reader) throw new Error('No response body')

			const decoder = new TextDecoder()
			let buffer = ''
			let lastCheckpointTime = 0
			const GENERATION_TIMEOUT_MS = 30000 // 30 second timeout
			let lastActivityTime = Date.now()

			while (true) {
				// Check for timeout
				if (Date.now() - lastActivityTime > GENERATION_TIMEOUT_MS) {
					reader.cancel()
					throw new Error('Generation timed out after 30 seconds')
				}

				const { done, value } = await Promise.race([
					reader.read(),
					new Promise<{ done: true; value: undefined }>((_, reject) =>
						setTimeout(() => reject(new Error('Read timeout')), GENERATION_TIMEOUT_MS)
					),
				])
				if (done) break

				// Update activity timestamp on data received
				lastActivityTime = Date.now()

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split('\n')
				buffer = lines.pop() ?? ''

				for (const line of lines) {
					if (!line.trim()) continue

					try {
						const update = JSON.parse(line)

						if (update.error) {
							throw new Error(update.error)
						}

						// Update stage telemetry
						if (update.stage) {
							addTelemetry('pipeline', { event: `stage_${update.stage}`, stage: update.stage })
							currentStage = update.stage as 'parse' | 'generate' | 'render'
						}

						// Stream partial code (partial is already accumulated, don't append)
						if (update.partial) {
							generatedCode = update.partial

							// Create streaming checkpoint every 500ms if connected
							const now = Date.now()
							if (currentGenerationId && connectionState.isConnected && now - lastCheckpointTime >= 500) {
								lastCheckpointTime = now
								updateStreamingCheckpoint(
									currentGenerationId,
									generatedCode,
									currentStage ?? 'generate',
									{ streamProgress: generatedCode.length }
								)
							}
						}

						// Final rendered output
						if (update.rendered?.html) {
							previewHtml = update.rendered.html
							metrics.lastRenderMs = performance.now() - startTime
						}

						// Handle complete event - generation finished
						if (update.stage === 'complete' && update.code) {
							generatedCode = update.code
							if (update.rendered?.html) {
								previewHtml = update.rendered.html
							}
							addTelemetry('pipeline', {
								event: 'generation_stream_complete',
								intent: update.intent,
								codeLength: update.code.length,
							})
						}
					} catch (parseErr) {
						// Skip invalid JSON lines
						if (parseErr instanceof SyntaxError) continue
						throw parseErr
					}
				}
			}

			const duration = performance.now() - startTime
			metrics.lastGenerationMs = duration
			metrics.totalRuns++

			// Add OID attributes to generated code for visual editing tracking
			generatedCode = addOidAttributes(generatedCode)

			// Re-render preview with OID-enhanced code
			await regeneratePreview(generatedCode)

			addTelemetry('pipeline', {
				event: 'generation_completed',
				durationMs: duration
			})

			// Update generation record with final code and HTML
			if (currentGenerationId && connectionState.isConnected) {
				try {
					await pb.generations.updateGeneration(currentGenerationId, {
						code: generatedCode,
						html: previewHtml,
						metadata: {
							provider: providerInfo?.provider ?? 'unknown',
							model: providerInfo?.model ?? 'unknown',
							durationMs: duration,
						},
					})

					// Finalize streaming checkpoint
					await finalizeStreamingCheckpoint(currentGenerationId, generatedCode, 'complete')
					lastSavedCode = generatedCode

					addTelemetry('pipeline', { event: 'generation_synced_to_pocketbase' })
				} catch (e) {
					console.warn('Failed to update generation record:', e)
				}
			}

			// Save to chronicle (local IndexedDB backup)
			await saveToChronicle(content, generatedCode, previewHtml, {
				provider: providerInfo?.provider ?? 'unknown',
				model: providerInfo?.model ?? 'unknown',
				durationMs: duration,
				hasFigmaTokens: !!figmaTokens,
				figmaFile: figmaTokens?.source.fileName,
			})

			state = 'idle'
			currentStage = null
		} catch (err) {
			error = err instanceof Error ? err.message : 'Generation failed'
			state = 'error'
			currentStage = null
			addTelemetry('error', { message: error })

			// Reset streaming checkpoint on error
			resetStreamingCheckpoint()
		}
	}

	// Simple markdown to HTML preview (placeholder for LLM generation)
	function markdownToPreview(markdown: string): string {
		// Parse basic markdown
		let html = markdown
			// Headers
			.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-2">$1</h3>')
			.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
			.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
			// Bold and italic
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			// Lists
			.replace(/^\- (.*$)/gm, '<li class="ml-4">$1</li>')
			// Code blocks
			.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-800 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')
			// Inline code
			.replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-sm">$1</code>')
			// Paragraphs
			.replace(/\n\n/g, '</p><p class="mb-4">')

		// Wrap in document - use string concatenation to avoid Svelte parsing issues
		const scriptOpen = '<' + 'script'
		const scriptClose = '</' + 'script>'

		return '<!DOCTYPE html>' +
			'<html lang="en">' +
			'<head>' +
			'<meta charset="UTF-8">' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			scriptOpen + ' src="https://cdn.tailwindcss.com">' + scriptClose +
			'<style>' +
			'body { font-family: system-ui, -apple-system, sans-serif; background: #18181b; color: #fafafa; padding: 2rem; margin: 0; }' +
			'</style>' +
			'</head>' +
			'<body>' +
			'<div class="max-w-2xl mx-auto">' +
			'<p class="mb-4">' + html + '</p>' +
			'</div>' +
			scriptOpen + '>' +
			'window.parent.postMessage({ type: "ready", timestamp: Date.now() }, "*");' +
			scriptClose +
			'</body>' +
			'</html>'
	}

	// Add telemetry event
	function addTelemetry(type: TelemetryEvent['type'], data: Record<string, unknown>) {
		telemetry = [...telemetry.slice(-99), {
			type,
			timestamp: performance.now(),
			data,
		}]
	}

	// Handle preview ready
	function handlePreviewReady() {
		const renderTime = performance.now()
		metrics.lastRenderMs = renderTime
		addTelemetry('render', { event: 'preview_ready' })
	}


	onMount(async () => {
		// Check for DEV_INFO flag
		showDevInfo = localStorage.getItem('DEV_INFO') === 'true' ||
			new URLSearchParams(window.location.search).has('dev')

		if (showDevInfo) {
			(globalThis as Record<string, unknown>).DEV_INFO = true
		}

		// Load toggle states from localStorage
		showChronicle = localStorage.getItem('showChronicle') === 'true'
		showFigma = localStorage.getItem('showFigma') === 'true'
		showSessions = localStorage.getItem('showSessions') === 'true'

		// Initialize PocketBase
		try {
			initPocketBase()
			startAutoSync()

			// Subscribe to connection state changes
			unsubscribeConnection = subscribeToConnectionState((state) => {
				connectionState = state
			})

			addTelemetry('pipeline', { event: 'pocketbase_initialized' })
		} catch (e) {
			console.warn('PocketBase initialization failed:', e)
		}

		// Run chronicle migration from localStorage
		try {
			const migrationResult = await chronicleDB.migrateFromLocalStorage()
			if (migrationResult.sessions > 0 || migrationResult.chat > 0) {
				console.log(`Chronicle migration: ${migrationResult.sessions} sessions, ${migrationResult.chat} chat messages`)
			}
		} catch (e) {
			console.warn('Chronicle migration failed:', e)
		}

		addTelemetry('pipeline', { event: 'studio_mounted' })

		// Fetch provider info
		try {
			const res = await fetch('/api/provider')
			if (res.ok) {
				providerInfo = await res.json()
				addTelemetry('llm', { event: 'provider_loaded', provider: providerInfo?.provider })
			}
		} catch (err) {
			console.warn('Failed to load provider info:', err)
		}

		// Add global mouse event listeners for panel resizing
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('mouseup', handleMouseUp)

		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleMouseUp)
		}
	})

	onDestroy(() => {
		// Cleanup PocketBase
		stopAutoSync()
		if (unsubscribeConnection) {
			unsubscribeConnection()
		}
	})
</script>

<svelte:head>
	<title>v0-clone Studio</title>
</svelte:head>

<div class="h-screen flex flex-col overflow-hidden">
	<!-- Header -->
	<header class="h-14 border-b border-[var(--color-border)] flex items-center px-4 gap-4 bg-[var(--color-bg-secondary)]">
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
				<span class="text-white font-bold text-sm">v0</span>
			</div>
			<span class="font-semibold text-lg">Studio</span>
		</div>

		<div class="flex-1"></div>

		<!-- Status indicator -->
		<div class="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
			{#if state === 'generating'}
				<div class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
				<span>Generating...</span>
			{:else if state === 'loading'}
				<div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
				<span>Loading...</span>
			{:else if state === 'error'}
				<div class="w-2 h-2 rounded-full bg-red-500"></div>
				<span>Error</span>
			{:else}
				<div class="w-2 h-2 rounded-full bg-green-500"></div>
				<span>Ready</span>
			{/if}
		</div>

		<!-- Model Settings button -->
		<button
			onclick={() => showSettings = true}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth flex items-center gap-2
				bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
			title="Configure model settings"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			{#if providerInfo}
				<span class="hidden sm:inline text-xs">{providerInfo.model}</span>
			{:else}
				<span class="hidden sm:inline">Settings</span>
			{/if}
		</button>

		<!-- Theme toggle -->
		<ThemeToggle />

		<!-- Figma toggle -->
		<button
			onclick={() => {
				showFigma = !showFigma
				localStorage.setItem('showFigma', String(showFigma))
			}}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth flex items-center gap-1.5
				{showFigma ? 'bg-purple-600 text-white' : figmaTokens ? 'bg-purple-600/30 text-purple-300' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
			title="{figmaTokens ? 'Figma tokens loaded' : 'Configure Figma integration'}"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5.5 9a3.5 3.5 0 103.5-3.5H5.5V9z"/>
				<path d="M5.5 5.5A3.5 3.5 0 119 9H5.5V5.5z"/>
				<path d="M5.5 12.5A3.5 3.5 0 119 16H5.5v-3.5z"/>
				<path d="M5.5 19.5A3.5 3.5 0 119 16H5.5v3.5z"/>
				<path d="M12.5 12.5a3.5 3.5 0 107 0 3.5 3.5 0 00-7 0z"/>
			</svg>
			Figma
			{#if figmaTokens}
				<span class="w-2 h-2 rounded-full bg-green-400"></span>
			{/if}
		</button>

		<!-- Sessions toggle -->
		<button
			onclick={() => {
				showSessions = !showSessions
				localStorage.setItem('showSessions', String(showSessions))
			}}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth flex items-center gap-1.5
				{showSessions ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
			title="View conversation history"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
			</svg>
			Sessions
		</button>

		<!-- Chronicle toggle -->
		<button
			onclick={() => {
				showChronicle = !showChronicle
				localStorage.setItem('showChronicle', String(showChronicle))
			}}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth flex items-center gap-1.5
				{showChronicle ? 'bg-purple-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
			title="Toggle artifact chronicle"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			Chronicle
		</button>

		<!-- Dev info toggle -->
		<button
			onclick={() => showDevInfo = !showDevInfo}
			class="px-3 py-1.5 text-sm rounded-md transition-all-smooth
				{showDevInfo ? 'bg-blue-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'}"
		>
			DevInfo
		</button>
	</header>

	<!-- Main content -->
	<main class="flex-1 flex overflow-hidden relative">
		<!-- Left panel - Chat (25%) -->
		<div class="flex flex-col border-r border-[var(--color-border)]" style="width: {leftPanelWidth}%">
			<!-- Figma Integration (collapsible) -->
			{#if showFigma}
				<FigmaImporter
					onImport={handleFigmaImport}
					on:clear={handleFigmaClear}
				/>
			{/if}

			<ChatPanel
				bind:this={chatPanelRef}
				onSubmit={handleChatSubmit}
				history={chatHistory}
				isGenerating={state === 'generating'}
				onConversationChange={handleConversationChange}
				onSessionChange={handleSessionChange}
			/>
		</div>

		<!-- Sessions panel (slide-out from left, over chat) -->
		{#if showSessions}
			<div
				class="absolute left-0 top-14 bottom-8 z-10 animate-slide-in-left border-r border-[var(--color-border)] shadow-lg"
				style="width: {sessionsPanelWidth + leftPanelWidth}%"
			>
				<SessionList
					onSessionSelect={handleSessionSelect}
					onNewSession={handleNewSession}
					{currentSessionId}
				/>
			</div>
		{/if}

		<!-- Left divider -->
		<div
			onmousedown={handleLeftMouseDown}
			class="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors cursor-col-resize flex-shrink-0
				{isDraggingLeft ? 'bg-[var(--color-accent)]' : ''}"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize chat panel"
		></div>

		<!-- Center panel - Canvas (50%) -->
		<div
			class="flex flex-col flex-1"
			style="width: {100 - leftPanelWidth - rightPanelWidth - (showStyleInspector ? 20 : 0)}%"
			oncontextmenu={handleContextMenu}
		>
			<Canvas
				html={previewHtml}
				studioState={state}
				currentStage={currentStage}
				generatedCode={generatedCode}
				onReady={handlePreviewReady}
				onElementSelect={handleElementSelect}
			/>
		</div>

		<!-- Right divider -->
		<div
			onmousedown={handleRightMouseDown}
			class="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent)] transition-colors cursor-col-resize flex-shrink-0
				{isDraggingRight ? 'bg-[var(--color-accent)]' : ''}"
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize code panel"
		></div>

		<!-- Right panel - Code Inspector (25%) -->
		<div class="flex flex-col border-l border-[var(--color-border)]" style="width: {showChronicle ? rightPanelWidth - chroniclePanelWidth : rightPanelWidth}%">
			<CodeInspector
				code={generatedCode}
				onCodeChange={handleCodeChange}
				language="svelte"
			/>
		</div>

		<!-- Chronicle panel (slide-in from right) -->
		{#if showChronicle}
			<div
				class="flex flex-col border-l border-[var(--color-border)] animate-slide-in-right"
				style="width: {chroniclePanelWidth}%"
			>
				<ChroniclePanel
					onArtifactSelect={handleArtifactSelect}
				/>
			</div>
		{/if}

		<!-- Style Inspector panel (appears when element is selected) -->
		{#if showStyleInspector}
			<div class="animate-slide-in-right">
				<StyleInspector
					{selectedElement}
					onStyleChange={handleStyleChange}
					onClose={handleStyleInspectorClose}
				/>
			</div>
		{/if}
	</main>

	<!-- Context Menu (appears on right-click when element is selected) -->
	<ContextMenu
		{selectedElement}
		position={contextMenuPosition}
		onAction={handleContextMenuAction}
		onClose={handleContextMenuClose}
	/>

	<!-- Error Dialog -->
	<Dialog
		open={showErrorDialog}
		onOpenChange={(open) => { if (!open) { error = null; state = 'idle' } }}
		title="Error"
	>
		{#snippet children()}
			<p class="text-sm text-[var(--color-text-muted)] mb-4">{error}</p>
			<button
				onclick={() => { error = null; state = 'idle' }}
				class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm transition-all-smooth"
			>
				Dismiss
			</button>
		{/snippet}
	</Dialog>

	<!-- Settings Panel -->
	{#if showSettings}
		<SettingsPanel
			onClose={() => showSettings = false}
			onSettingsChange={handleSettingsChange}
		/>
	{/if}

	<!-- Dev info panel -->
	{#if showDevInfo}
		<DevInfo {telemetry} {metrics} studioState={state} {providerInfo} />
	{/if}

	<!-- Status bar -->
	<StatusBar studioState={state} {metrics} file={currentFile} />
</div>

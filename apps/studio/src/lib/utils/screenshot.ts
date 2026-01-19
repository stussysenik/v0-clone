/**
 * Screenshot utility for capturing preview content
 */

export async function takeScreenshot(iframe: HTMLIFrameElement): Promise<void> {
	try {
		// Try to capture the iframe's content document
		const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

		if (!iframeDoc) {
			throw new Error('Cannot access iframe content')
		}

		// Create a canvas element
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		if (!ctx) {
			throw new Error('Cannot create canvas context')
		}

		// Set canvas dimensions to match iframe
		canvas.width = iframe.clientWidth
		canvas.height = iframe.clientHeight

		// Use a simple approach: convert HTML to image data
		// For now, we'll use a workaround that captures the iframe as-is
		// A full implementation would use html2canvas or similar

		// Alternative: Use the browser's built-in screenshot API if available
		// @ts-expect-error - navigator.mediaDevices.getDisplayMedia is experimental
		if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
			const stream = await navigator.mediaDevices.getDisplayMedia({
				// @ts-expect-error - preferCurrentTab is experimental
				preferCurrentTab: true,
				video: {
					// @ts-expect-error - displaySurface is experimental
					displaySurface: 'browser'
				}
			})

			const video = document.createElement('video')
			video.srcObject = stream
			video.play()

			// Wait for video to be ready
			await new Promise((resolve) => {
				video.onloadedmetadata = resolve
			})

			// Draw video frame to canvas
			canvas.width = video.videoWidth
			canvas.height = video.videoHeight
			ctx.drawImage(video, 0, 0)

			// Stop the stream
			stream.getTracks().forEach(track => track.stop())

			// Download the screenshot
			downloadCanvas(canvas, 'preview-screenshot')
		} else {
			// Fallback: Just show a message
			alert('Screenshot functionality requires html2canvas library or browser support for getDisplayMedia')
		}
	} catch (error) {
		console.error('Screenshot failed:', error)
		alert('Failed to take screenshot. Try using your browser\'s built-in screenshot tool.')
	}
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
	canvas.toBlob((blob) => {
		if (!blob) {
			console.error('Failed to create blob from canvas')
			return
		}

		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.download = `${filename}-${Date.now()}.png`
		link.href = url
		link.click()

		// Clean up
		setTimeout(() => URL.revokeObjectURL(url), 100)
	})
}

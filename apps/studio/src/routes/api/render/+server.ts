import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

/**
 * API endpoint for re-rendering code to HTML
 * Used for two-way sync when visual edits update the code
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, language = 'svelte' } = await request.json()

		if (!code || typeof code !== 'string') {
			return json({ error: 'Code is required' }, { status: 400 })
		}

		// Render the code to HTML
		const html = renderCode(code, language)

		return json({ html })
	} catch (err) {
		const errorMsg = err instanceof Error ? err.message : 'Render failed'
		return json({ error: errorMsg }, { status: 500 })
	}
}

/**
 * Render code to HTML based on language
 */
function renderCode(code: string, language: string): string {
	switch (language) {
		case 'svelte':
			return renderSvelte(code)
		case 'react':
		case 'tsx':
			return renderReact(code)
		case 'html':
		default:
			return renderHTML(code)
	}
}

/**
 * Render Svelte component to HTML
 */
function renderSvelte(code: string): string {
	// Strip markdown code fences if present
	const cleanCode = extractCodeFromMarkdown(code)

	// Extract template (everything outside script and style tags)
	const styleMatch = cleanCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)

	// Get the template part
	const template = cleanCode
		.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
		.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
		.trim()

	return wrapInDocument(template, styleMatch?.[1])
}

/**
 * Render React component to HTML
 */
function renderReact(code: string): string {
	const cleanCode = extractCodeFromMarkdown(code)

	// Extract JSX from the return statement
	const returnMatch = cleanCode.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*\}/)
	const jsx = returnMatch?.[1] ?? cleanCode

	// Convert className to class for HTML rendering
	const html = jsx.replace(/className=/g, 'class=')

	return wrapInDocument(html)
}

/**
 * Render plain HTML
 */
function renderHTML(code: string): string {
	const cleanCode = extractCodeFromMarkdown(code)

	// Check if it's a full document
	if (cleanCode.includes('<!DOCTYPE') || cleanCode.includes('<html')) {
		return cleanCode
	}

	// Extract inline styles if present
	const styleMatch = cleanCode.match(/<style[^>]*>([\s\S]*?)<\/style>/)
	const css = styleMatch?.[1]
	const template = cleanCode.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').trim()

	return wrapInDocument(template, css)
}

/**
 * Extract code from markdown code blocks
 */
function extractCodeFromMarkdown(code: string): string {
	const codeBlockMatch = code.match(/```(?:svelte|html|react|jsx|tsx)?\n?([\s\S]*?)```/)
	if (codeBlockMatch) {
		return codeBlockMatch[1].trim()
	}
	return code.trim()
}

/**
 * Wrap content in a full HTML document
 */
function wrapInDocument(content: string, customCss?: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    * { transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
    ${customCss ?? ''}
  </style>
</head>
<body>
  <div id="app">
    ${content}
  </div>
  <script>
    window.parent.postMessage({ type: 'ready', timestamp: Date.now() }, '*');

    // Handle style update messages from parent
    window.addEventListener('message', (event) => {
      if (event.data.type === 'updateElementStyle') {
        const { selector, property, value } = event.data.payload;
        const element = document.querySelector(selector);
        if (element) {
          element.style[property] = value;
        }
      }
    });
  </script>
</body>
</html>`
}

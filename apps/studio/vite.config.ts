import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	server: {
		port: 5173,
		strictPort: false,
	},
	optimizeDeps: {
		exclude: ['@v0-clone/shared', '@v0-clone/llm', '@v0-clone/pipeline', '@v0-clone/renderer']
	}
});
